import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import toast from 'react-hot-toast';
import { getSharedSocket, getFileChunksBuffer } from './useSocket';

// 2 MB per chunk — larger chunks = far fewer round trips = much faster on LAN.
// Server acks immediately after forwarding so the mobile-disconnect risk is gone.
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB

// Number of chunks to send in parallel (sliding window).
// Each in-flight chunk still waits for its own ack, so the server is never
// flooded. Window of 4 gives ~4× throughput vs single-at-a-time.
const WINDOW_SIZE = 4;

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

  // Send files in chunks with ack-based windowed flow control.
  // WINDOW_SIZE chunks are in-flight simultaneously; each still requires an ack.
  // This gives LAN-speed throughput without flooding mobile socket buffers.
  const sendFiles = useCallback(async (recipientId) => {
    const sock = getSharedSocket();
    if (!sock || !deviceInfo.id || filesToSend.length === 0) return;

    const store = useAppStore.getState();
    const recipientDevice = store.discoveredDevices.find(d => d.id === recipientId);
    const recipientName = recipientDevice?.name || 'Unknown Device';

    console.log('[Send] Sending to:', recipientName);

    for (const f of filesToSend) {
      const uniqueId   = `${Date.now()}-${Math.random().toString(36).substr(2, 15)}`;
      const transferId = `send-${uniqueId}`;

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

      const file        = f.file;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      console.log(`[Send] "${f.name}" → ${totalChunks} chunks @ ${CHUNK_SIZE / 1024}KB, window=${WINDOW_SIZE}`);

      /**
       * Sends a single chunk and returns a Promise that resolves when the
       * server acks it. Rejects on timeout or server error.
       */
      const sendChunk = (chunkIndex) => new Promise(async (resolve, reject) => {
        if (pendingTransfers.get(transferId)?.cancelled) {
          return reject(new Error('Transfer cancelled'));
        }

        const start = chunkIndex * CHUNK_SIZE;
        const end   = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = await file.slice(start, end).arrayBuffer().catch(reject);
        if (!chunk) return;

        const timeoutId = setTimeout(() => {
          reject(new Error(`Chunk ${chunkIndex + 1} timed out`));
        }, 60_000); // 60s per-chunk timeout (generous for large chunks)

        sock.emitWithAck('files:sendChunk', {
          fileId:      uniqueId,
          transferId,
          senderId:    deviceInfo.id,
          senderName:  deviceInfo.name,
          recipientId,
          filename:    f.name,
          fileSize:    f.size,
          fileType:    f.type,
          chunkIndex,
          totalChunks,
          chunkData:   new Uint8Array(chunk),
        }).then((ackData) => {
          clearTimeout(timeoutId);
          if (ackData?.ok === false) reject(new Error(ackData.error || 'Server rejected chunk'));
          else resolve();
        }).catch((err) => { clearTimeout(timeoutId); reject(err); });
      });

      try {
        // Sliding window: keep WINDOW_SIZE chunks in-flight at a time
        let nextChunk  = 0;
        let completed  = 0;
        let failed     = null;

        while (completed < totalChunks && !failed) {
          if (pendingTransfers.get(transferId)?.cancelled) throw new Error('Transfer cancelled');

          // Fill the window with pending chunks
          const batch = [];
          while (batch.length < WINDOW_SIZE && nextChunk < totalChunks) {
            batch.push(sendChunk(nextChunk++));
          }

          // Wait for the whole window batch to ack
          const results = await Promise.allSettled(batch);
          for (const r of results) {
            if (r.status === 'rejected') { failed = r.reason; break; }
            completed++;
          }

          if (!failed) {
            const progress = Math.round((completed / totalChunks) * 100);
            updateActiveTransfer(transferId, { progress, status: 'sending' });
            console.log(`[Send] ${completed}/${totalChunks} acked (${progress}%)`);
          }
        }

        if (failed) throw failed;

        console.log(`[Send] "${f.name}" complete (${totalChunks} chunks)`);
        pendingTransfers.delete(transferId);

      } catch (error) {
        pendingTransfers.delete(transferId);
        if (error.message === 'Transfer cancelled') {
          updateActiveTransfer(transferId, { status: 'cancelled' });
        } else {
          console.error(`[Error] Failed to send "${f.name}":`, error);
          updateActiveTransfer(transferId, { status: 'error', progress: 0 });
          toast.error(`Failed to send ${f.name}: ${error.message}`);
          return;
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
