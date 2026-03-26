import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    // Auto-detect the server URL based on current location
    const url = typeof window !== 'undefined' ? window.location.origin : '';

    socket = io(url, {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Infinite retries
    });

    socket.on('connect', () => {
      console.log('Socket.io connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
