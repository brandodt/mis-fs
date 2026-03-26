const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory device registry
const devices = new Map(); // deviceId -> { id, name, socketId, mode }
const fileChunks = new Map(); // fileId -> { chunks: [], metadata }

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Next.js parses the URL internally — no need to pass parsedUrl
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 10 * 1024 * 1024 * 1024, // 10GB max file size
    pingInterval: 25000, // Send ping every 25 seconds
    pingTimeout: 60000, // Wait 60 seconds for pong before disconnecting
  });

  io.on('connection', (socket) => {
    console.log('Device connected:', socket.id);

    // Device registers itself
    socket.on('device:register', (deviceInfo) => {
      const deviceId = deviceInfo.id;
      devices.set(deviceId, {
        id: deviceId,
        name: deviceInfo.name,
        socketId: socket.id,
        mode: deviceInfo.mode, // 'send' or 'receive'
      });

      // Broadcast updated device list
      io.emit('devices:updated', Array.from(devices.values()));
      console.log(`Device registered: ${deviceInfo.name} (${deviceInfo.mode} mode)`);
    });

    // Update device mode (Send/Receive toggle)
    socket.on('device:setMode', (data) => {
      const device = devices.get(data.deviceId);
      if (device) {
        device.mode = data.mode;
        io.emit('devices:updated', Array.from(devices.values()));
        console.log(`Device ${device.name} switched to ${data.mode} mode`);
      }
    });

    // List all devices
    socket.on('devices:list', (callback) => {
      callback(Array.from(devices.values()));
    });

    // Handle chunked file transfer with ack-based flow control.
    // The sender MUST use the ack callback to pace chunks — without it the
    // socket write-buffer floods on slow clients (mobile) causing disconnects.
    socket.on('files:sendChunk', (data, ack) => {
      const recipientDevice = devices.get(data.recipientId);

      if (!recipientDevice) {
        socket.emit('files:sendError', {
          error: 'Recipient device not found',
          recipientId: data.recipientId,
        });
        if (typeof ack === 'function') ack({ ok: false, error: 'Recipient not found' });
        return;
      }

      const recipientSocket = io.sockets.sockets.get(recipientDevice.socketId);

      if (!recipientSocket) {
        socket.emit('files:sendError', {
          error: 'Recipient not connected',
          recipientId: data.recipientId,
        });
        if (typeof ack === 'function') ack({ ok: false, error: 'Recipient offline' });
        return;
      }

      console.log(
        `[Chunk] ${data.chunkIndex + 1}/${data.totalChunks} from ${data.senderName} -> ${recipientDevice.name}`
      );

      // Forward chunk to recipient
      recipientSocket.emit('files:chunk', {
        transferId: data.transferId,
        filename: data.filename,
        fileSize: data.fileSize,
        fileType: data.fileType,
        chunkIndex: data.chunkIndex,
        totalChunks: data.totalChunks,
        chunkData: data.chunkData,
        senderName: data.senderName,
      });

      // Ack the sender NOW — the client-side files:chunk listener does not call
      // ack() so waiting for a recipient ack would deadlock (30s timeout).
      // Acking here means "I've queued delivery to the recipient" which is
      // sufficient backpressure: sender won't flood the buffer past this point.
      if (typeof ack === 'function') ack({ ok: true });

      // Notify sender of progress immediately (don't wait for recipient ack)
      socket.emit('files:progress', {
        transferId: data.transferId,
        chunkIndex: data.chunkIndex,
        totalChunks: data.totalChunks,
        progress: Math.round(((data.chunkIndex + 1) / data.totalChunks) * 100),
      });

      // Last chunk — tell both sides the transfer is complete
      if (data.chunkIndex === data.totalChunks - 1) {
        recipientSocket.emit('files:complete', {
          transferId: data.transferId,
          filename: data.filename,
          fileSize: data.fileSize,
          fileType: data.fileType,
          senderName: data.senderName,
        });

        socket.emit('files:sent', {
          transferId: data.transferId,
          recipientId: data.recipientId,
          recipientName: recipientDevice.name,
          filename: data.filename,
        });

        console.log(`[Complete] File transfer complete: ${data.filename}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      let disconnectedDevice = null;
      for (const [deviceId, device] of devices.entries()) {
        if (device.socketId === socket.id) {
          disconnectedDevice = deviceId;
          devices.delete(deviceId);
          break;
        }
      }

      if (disconnectedDevice) {
        io.emit('devices:updated', Array.from(devices.values()));
        console.log('Device disconnected:', disconnectedDevice);
      }
    });
  });

  // Set a generous HTTP timeout (30 min) to support large file transfers.
  // We do NOT log on timeout here — Next.js dev-mode compilation can take
  // 30-60 s and would spam false-positive warnings.
  httpServer.setTimeout(30 * 60 * 1000); // 30 minutes, no callback

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      let networkIp = 'YOUR_IP';

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            networkIp = iface.address;
            break;
          }
        }
      }

      console.log(`\n[Server] Next.js with Socket.io\n`);
      console.log(`  Local:        http://localhost:${port}`);
      console.log(`  Network:      http://${networkIp}:${port}\n`);
      console.log(`[Server] Running - devices can now connect and share files`);
    });
});
