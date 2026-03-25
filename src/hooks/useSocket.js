import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';

let socketInstance = null;
const fileChunksBuffer = new Map(); // Store received chunks (moved to module level)

// Global file transfer listeners setup
export function setupGlobalListeners(socket) {
  // Remove existing listeners if they exist to prevent duplicates
  if (socket.hasGlobalListeners) {
    console.log('[Files] Listeners already set up');
    return;
  }

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

  // Remove old listeners if reconnecting
  socket.off('files:chunk');
  socket.off('files:complete');
  socket.off('files:progress');
  socket.off('files:sent');
  socket.off('files:sendError');

  // Receive incoming file chunk
  socket.on('files:chunk', async (data) => {
    console.log(`[Receive] Chunk ${data.chunkIndex + 1}/${data.totalChunks} for ${data.filename}`);

    const transferId = data.transferId;
    const store = useAppStore.getState();

    // Add or update transfer progress
    const existingTransfer = store.activeTransfers.find(t => t.id === transferId);
    if (!existingTransfer) {
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

    // Store chunk in buffer
    if (!fileChunksBuffer.has(transferId)) {
      fileChunksBuffer.set(transferId, {});
    }
    const chunks = fileChunksBuffer.get(transferId);
    chunks[data.chunkIndex] = data.chunkData;

    // Calculate and update progress
    const receivedChunks = Object.keys(chunks).length;
    const progress = Math.round((receivedChunks / data.totalChunks) * 100);
    store.updateActiveTransfer(transferId, { progress, status: 'receiving' });

    console.log(`[Receive] Chunk ${data.chunkIndex + 1}/${data.totalChunks} received (${progress}%)`);
  });

  // File transfer completed
  socket.on('files:complete', (data) => {
    console.log('[Complete] File transfer completed:', data.filename);

    const transferId = data.transferId;
    const chunksMap = fileChunksBuffer.get(transferId);
    const store = useAppStore.getState();

    if (chunksMap) {
      // Convert sparse array to ordered chunks
      const chunkIndices = Object.keys(chunksMap).map(Number).sort((a, b) => a - b);
      const orderedChunks = chunkIndices.map(i => chunksMap[i]);

      console.log(`[Complete] Combining ${orderedChunks.length} chunks into blob...`);

      // Combine all chunks into one blob
      const blob = new Blob(orderedChunks, { type: data.fileType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);

      const transfer = store.activeTransfers.find(t => t.id === transferId);
      if (transfer) {
        store.updateActiveTransfer(transferId, {
          progress: 100,
          status: 'completed',
        });

        // Add to received files with blob URL
        store.addReceivedFile({
          id: Math.random().toString(36).substring(7),
          filename: data.filename,
          size: data.fileSize,
          type: data.fileType,
          data: blobUrl, // Blob URL for direct download
          receivedFrom: data.senderName,
          receivedAt: Date.now(),
        });

        const toast = require('react-hot-toast').default;
        toast.success(`${data.filename} received!`);

        // Clean up
        fileChunksBuffer.delete(transferId);

        console.log(`[Complete] File "${data.filename}" successfully received and ready for download`);
      }
    }
  });

  // Real-time progress update from server (sender side)
  socket.on('files:progress', (data) => {
    const store = useAppStore.getState();
    const transfer = store.activeTransfers.find(t => t.id === data.transferId);

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
    const transfer = store.activeTransfers.find(t => t.id === data.transferId);

    if (transfer && transfer.type === 'send') {
      store.updateActiveTransfer(data.transferId, {
        progress: 100,
        status: 'completed',
      });

      const toast = require('react-hot-toast').default;
      toast.success(`${data.filename} sent to ${data.recipientName}`);
    }

    store.clearFilesToSend();
  });

  socket.on('files:sendError', (data) => {
    console.error('[Error] Send error:', data);
    const toast = require('react-hot-toast').default;
    toast.error(`Error: ${data.error}`);
  });

  socket.hasGlobalListeners = true;
  console.log('[Files] Global file transfer listeners set up');
}

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reuse existing socket or create new one
    if (!socketInstance) {
      const { io } = require('socket.io-client');
      socketInstance = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        pingInterval: 25000, // Send ping every 25 seconds to keep connection alive
        pingTimeout: 60000, // Wait 60 seconds for pong before timeout
      });

      socketInstance.on('connect', () => {
        console.log('[Socket] Connected to server:', socketInstance.id);
        // Set up listeners once connected
        setupGlobalListeners(socketInstance);
      });

      socketInstance.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
      });

      // Handle reconnection
      socketInstance.on('reconnect', () => {
        console.log('[Socket] Reconnected to server');
        setupGlobalListeners(socketInstance);
      });

      socketInstance.on('reconnect_attempt', () => {
        console.log('[Socket] Attempting to reconnect...');
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Keep socket alive across component unmounts
    };
  }, []);

  return socketRef.current;
}

export function getSharedSocket() {
  if (typeof window === 'undefined') return null;

  if (!socketInstance) {
    const { io } = require('socket.io-client');
    socketInstance = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      pingInterval: 25000, // Send ping every 25 seconds to keep connection alive
      pingTimeout: 60000, // Wait 60 seconds for pong before timeout
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server:', socketInstance.id);
      setupGlobalListeners(socketInstance);
    });
  }

  return socketInstance;
}

export function getFileChunksBuffer() {
  return fileChunksBuffer;
}


