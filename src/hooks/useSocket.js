import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';

let socketInstance = null;
const fileChunksBuffer = new Map(); // Store received chunks (module-level singleton)

// ---------------------------------------------------------------------------
// Global file-transfer socket listeners
// ---------------------------------------------------------------------------
export function setupGlobalListeners(socket) {
  if (socket.hasGlobalListeners) {
    console.log('[Files] Listeners already set up');
    return;
  }

  // Clear any stale listeners before attaching fresh ones
  socket.off('files:chunk');
  socket.off('files:complete');
  socket.off('files:progress');
  socket.off('files:sent');
  socket.off('files:sendError');

  // Receive an incoming file chunk
  socket.on('files:chunk', (data) => {
    console.log(`[Receive] Chunk ${data.chunkIndex + 1}/${data.totalChunks} for ${data.filename}`);

    const { transferId } = data;
    const store = useAppStore.getState();

    const existing = store.activeTransfers.find((t) => t.id === transferId);
    if (!existing) {
      store.addActiveTransfer({
        id: transferId,
        type: 'receive',
        filename: data.filename,
        size: data.fileSize,
        progress: 0,
        status: 'receiving',
        sender: data.senderName,
        startTime: Date.now(),
        canCancel: true,
      });
      console.log(`[Receive] Started receiving "${data.filename}" from ${data.senderName}`);
    }

    if (!fileChunksBuffer.has(transferId)) {
      fileChunksBuffer.set(transferId, {});
    }
    fileChunksBuffer.get(transferId)[data.chunkIndex] = data.chunkData;

    const received = Object.keys(fileChunksBuffer.get(transferId)).length;
    const progress = Math.round((received / data.totalChunks) * 100);
    store.updateActiveTransfer(transferId, { progress, status: 'receiving' });
  });

  // All chunks received — reassemble blob
  socket.on('files:complete', (data) => {
    console.log('[Complete] File transfer completed:', data.filename);

    const { transferId } = data;
    const chunksMap = fileChunksBuffer.get(transferId);
    const store = useAppStore.getState();

    if (chunksMap) {
      const ordered = Object.keys(chunksMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map((i) => chunksMap[i]);

      console.log(`[Complete] Combining ${ordered.length} chunks into blob…`);

      const blob = new Blob(ordered, { type: data.fileType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);

      const transfer = store.activeTransfers.find((t) => t.id === transferId);
      if (transfer) {
        store.updateActiveTransfer(transferId, { progress: 100, status: 'completed' });
        store.addReceivedFile({
          id: Math.random().toString(36).substring(7),
          filename: data.filename,
          size: data.fileSize,
          type: data.fileType,
          data: blobUrl,
          receivedFrom: data.senderName,
          receivedAt: Date.now(),
        });

        // Dynamic import avoids CJS require() in an ESM module
        import('react-hot-toast').then(({ default: toast }) =>
          toast.success(`${data.filename} received!`)
        );

        fileChunksBuffer.delete(transferId);
        console.log(`[Complete] "${data.filename}" ready for download`);
      }
    }
  });

  // Sender-side progress echoed back from server
  socket.on('files:progress', (data) => {
    const store = useAppStore.getState();
    const transfer = store.activeTransfers.find((t) => t.id === data.transferId);
    if (transfer && transfer.type === 'send') {
      store.updateActiveTransfer(data.transferId, {
        progress: data.progress,
        status: 'sending',
      });
    }
  });

  socket.on('files:sent', (data) => {
    console.log('[Sent] File sent successfully:', data.filename);
    const store = useAppStore.getState();
    const transfer = store.activeTransfers.find((t) => t.id === data.transferId);
    if (transfer && transfer.type === 'send') {
      store.updateActiveTransfer(data.transferId, { progress: 100, status: 'completed' });
      import('react-hot-toast').then(({ default: toast }) =>
        toast.success(`${data.filename} sent to ${data.recipientName}`)
      );
    }
    store.clearFilesToSend();
  });

  socket.on('files:sendError', (data) => {
    console.error('[Error] Send error:', data);
    import('react-hot-toast').then(({ default: toast }) =>
      toast.error(`Error: ${data.error}`)
    );
  });

  socket.hasGlobalListeners = true;
  console.log('[Files] Global file transfer listeners set up');
}

// ---------------------------------------------------------------------------
// Socket singleton factory
// ---------------------------------------------------------------------------
function createSocketInstance() {
  if (typeof window === 'undefined') return null;

  // socket.io-client is a client-only package — safe to require here since
  // this function is only ever called in a browser context (window check above).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { io } = require('socket.io-client');

  const socket = io(window.location.origin, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server:', socket.id);
    setupGlobalListeners(socket);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from server');
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
  });

  socket.on('reconnect', () => {
    console.log('[Socket] Reconnected to server');
    // Reset flag so listeners are re-attached after reconnect
    socket.hasGlobalListeners = false;
    setupGlobalListeners(socket);
  });

  socket.on('reconnect_attempt', () => {
    console.log('[Socket] Attempting to reconnect…');
  });

  return socket;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the shared socket, creating it on first call (browser only). */
export function getSharedSocket() {
  if (typeof window === 'undefined') return null;
  if (!socketInstance) {
    socketInstance = createSocketInstance();
  }
  return socketInstance;
}

/** React hook that exposes the shared socket ref. */
export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    socketRef.current = getSharedSocket();
    // Intentionally keep socket alive across component unmounts.
  }, []);

  return socketRef.current;
}

/** Exposes the module-level chunk buffer (used by useFileTransfer). */
export function getFileChunksBuffer() {
  return fileChunksBuffer;
}
