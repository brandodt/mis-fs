import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';
import { getSharedSocket, getFileChunksBuffer } from './useSocket';

// 256 KB per chunk — safe for mobile WebSocket buffers.
// Larger chunks (1MB+) flood Android Chrome's receive buffer causing disconnects.
const CHUNK_SIZE = 256 * 1024;

// Module-level map so cancelTransfer() can signal the ack loop to abort
const pendingTransfers = new Map();

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

  // Send files in chunks with ack-based flow control.
  // Each chunk waits for the server to confirm delivery before the next is sent.
  // This prevents socket write-buffer overflow on slow/mobile clients.
  const sendFiles = useCallback(async (recipientId) => {
    const sock = getSharedSocket();
    if (!sock || !deviceInfo.id || filesToSend.length === 0) return;

    console.log('[Send] Socket connected:', sock.connected, 'Socket ID:', sock.id);

    const store = useAppStore.getState();
    const recipientDevice = store.discoveredDevices.find(d => d.id === recipientId);
    const recipientName = recipientDevice?.name || 'Unknown Device';

    console.log('[Send] Sending to:', recipientName);

    for (const f of filesToSend) {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 15)}`;
      const transferId = `send-${uniqueId}`;

      // Store a cancel flag on the Map so cancelTransfer() can abort mid-loop
      pendingTransfers.set(transferId, { cancelled: false });

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

      const file = f.file;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      console.log(`[Send] "${f.name}" → ${totalChunks} chunks @ ${CHUNK_SIZE / 1024}KB`);

      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          // Honour cancellation between chunks
          if (pendingTransfers.get(transferId)?.cancelled) {
            console.log(`[Send] Transfer ${transferId} cancelled at chunk ${chunkIndex}`);
            throw new Error('Transfer cancelled');
          }

          const start = chunkIndex * CHUNK_SIZE;
          const end   = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = await file.slice(start, end).arrayBuffer();

          // Emit with ack — await server confirmation before sending next chunk.
          // This is the critical back-pressure mechanism.
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Chunk ${chunkIndex + 1} timed out (no ack from server)`));
            }, 30_000); // 30s per-chunk timeout

            sock.emitWithAck('files:sendChunk', {
              fileId: uniqueId,
              transferId,
              senderId:    deviceInfo.id,
              senderName:  deviceInfo.name,
              recipientId,
              filename:  f.name,
              fileSize:  f.size,
              fileType:  f.type,
              chunkIndex,
              totalChunks,
              chunkData: new Uint8Array(chunk),
            }).then((ackData) => {
              clearTimeout(timeout);
              if (ackData?.ok === false) {
                reject(new Error(ackData.error || 'Server rejected chunk'));
              } else {
                resolve();
              }
            }).catch((err) => {
              clearTimeout(timeout);
              reject(err);
            });
          });

          const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          updateActiveTransfer(transferId, { progress, status: 'sending' });
          console.log(`[Send] Chunk ${chunkIndex + 1}/${totalChunks} acked (${progress}%)`);
        }

        console.log(`[Send] "${f.name}" complete`);
        pendingTransfers.delete(transferId);

      } catch (error) {
        pendingTransfers.delete(transferId);
        if (error.message === 'Transfer cancelled') {
          updateActiveTransfer(transferId, { status: 'cancelled' });
        } else {
          console.error(`[Error] Failed to send "${f.name}":`, error);
          updateActiveTransfer(transferId, { status: 'error', progress: 0 });
          toast.error(`Failed to send ${f.name}: ${error.message}`);
          return; // stop sending further files on error
        }
      }
    }

    clearFilesToSend();
    toast.success('All files sent!');
  }, [filesToSend, deviceInfo.id, deviceInfo.name, addActiveTransfer, updateActiveTransfer, clearFilesToSend]);

  // Handle cancel transfer — sets a flag so the ack loop aborts between chunks
  const handleCancelTransfer = useCallback((transferId) => {
    const pending = pendingTransfers.get(transferId);
    if (pending) pending.cancelled = true;
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
