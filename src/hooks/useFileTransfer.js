import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';
import { getSharedSocket, getFileChunksBuffer } from './useSocket';

// Track transfer IDs for cancellation
const pendingTransfers = new Map();
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

export function useFileTransfer() {
  const addFileToSend = useAppStore((s) => s.addFileToSend);
  const filesToSend = useAppStore((s) => s.filesToSend);
  const clearFilesToSend = useAppStore((s) => s.clearFilesToSend);
  const addReceivedFile = useAppStore((s) => s.addReceivedFile);
  const removeReceivedFile = useAppStore((s) => s.removeReceivedFile);
  const deviceInfo = useAppStore((s) => s.deviceInfo);
  const addActiveTransfer = useAppStore((s) => s.addActiveTransfer);
  const updateActiveTransfer = useAppStore((s) => s.updateActiveTransfer);
  const removeActiveTransfer = useAppStore((s) => s.removeActiveTransfer);

  const transferIdsRef = useRef(new Map());

  // Setup listeners on mount - they're now set up in useSocket
  useEffect(() => {
    console.log('[FileTransfer] Hook mounted');
  }, []);

  // Select local files for sending
  const selectFilesToSend = useCallback(async (files) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB per file

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" is too large (max 10GB)`);
        continue;
      }

      addFileToSend({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    toast.success(`${files.length} file(s) selected`);
  }, [addFileToSend]);

  // Send file in chunks
  const sendFiles = useCallback(async (recipientId) => {
    const sock = getSharedSocket();
    if (!sock || !deviceInfo.id || filesToSend.length === 0) return;

    console.log('[Send] Socket connected:', sock.connected, 'Socket ID:', sock.id);

    try {
      console.log('[Send] Starting chunked file transfer...', filesToSend);

      // Get recipient name from discovered devices
      const store = useAppStore.getState();
      const recipientDevice = store.discoveredDevices.find(d => d.id === recipientId);
      const recipientName = recipientDevice?.name || 'Unknown Device';

      console.log('[Send] Sending to:', recipientName, '(ID:', recipientId, ')');

      for (const f of filesToSend) {
        // Use more robust ID generation to avoid conflicts with concurrent transfers
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 15)}`;
        const transferId = `send-${uniqueId}`;

        try {
          // Add to active transfers with proper identifiers
          addActiveTransfer({
            id: transferId,
            type: 'send',
            filename: f.name,
            size: f.size,
            progress: 0,
            status: 'preparing',
            from: deviceInfo.name,
            to: recipientName,
            recipientId,
            startTime: Date.now(),
            canCancel: true,
          });

          console.log(`[Send] Chunking file "${f.name}" (${(f.size / 1024 / 1024 / 1024).toFixed(2)}GB) to ${recipientName}...`);

          // Read file and send in chunks
          const file = f.file;
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

          console.log(`[Send] Total chunks: ${totalChunks}`);

          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = await file.slice(start, end).arrayBuffer();

            // Emit chunk
            sock.emit('files:sendChunk', {
              fileId: uniqueId,
              transferId,
              senderId: deviceInfo.id,
              senderName: deviceInfo.name,
              recipientId,
              filename: f.name,
              fileSize: f.size,
              fileType: f.type,
              chunkIndex,
              totalChunks,
              chunkData: new Uint8Array(chunk),
            });

            // Update progress
            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            updateActiveTransfer(transferId, {
              progress,
              status: 'sending',
            });

            console.log(`[Send] Chunk ${chunkIndex + 1}/${totalChunks} sent (${progress}%)`);

            // Longer delay between chunks to allow time for processing
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          console.log(`[Send] File "${f.name}" sent (${totalChunks} chunks)`);

        } catch (error) {
          console.error(`[Error] Failed to send file "${f.name}":`, error);
          updateActiveTransfer(`send-${uniqueId}`, {
            status: 'error',
            progress: 0,
          });
          toast.error(`Failed to send ${f.name}: ${error.message}`);
        }
      }

      clearFilesToSend();
      toast.success('All files sent!');

    } catch (error) {
      console.error('[Error] Send error:', error);
      toast.error(`Failed to send files: ${error.message}`);
    }
  }, [filesToSend, deviceInfo.id, deviceInfo.name, addActiveTransfer, updateActiveTransfer, clearFilesToSend]);

  // Handle cancel transfer
  const handleCancelTransfer = useCallback((transferId) => {
    removeActiveTransfer(transferId);
    const fileChunksBuffer = getFileChunksBuffer();
    fileChunksBuffer.delete(transferId);
    toast.success('Transfer cancelled');
  }, [removeActiveTransfer]);

  // Download received file
  const downloadReceivedFile = useCallback((fileId, filename, data) => {
    try {
      const transferId = `download-${Date.now()}-${Math.random().toString(36).substr(2, 15)}`;

      addActiveTransfer({
        id: transferId,
        type: 'download',
        filename,
        progress: 100,
        status: 'completed',
        startTime: Date.now(),
      });

      // If data is a blob URL, download from it directly
      if (typeof data === 'string' && data.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = data;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (data instanceof Uint8Array) {
        // Create blob and download
        const blob = new Blob([data]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`${filename} downloaded`);

    } catch (error) {
      console.error('[Error] Download error:', error);
      toast.error('Failed to download file');
    }
  }, [addActiveTransfer]);

  return {
    selectFilesToSend,
    sendFiles,
    downloadReceivedFile,
    removeReceivedFile,
    cancelTransfer: handleCancelTransfer,
  };
}
