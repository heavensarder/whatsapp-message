require('dotenv').config({ path: '.env.local' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const { Server } = require('socket.io');
const waClient = require('./lib/wa-client');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const expressApp = express();
  // NOTE: Do NOT add express.json() or body-parser here!
  // express.json() would consume the HTTP body stream before Next.js API routes read it,
  // causing "Response body object should not be disturbed or locked" errors.

  const httpServer = createServer(expressApp);

  // Socket.io setup
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Pass io to WhatsApp client
  waClient.setIO(io);

  // Expose waClient on globalThis so Next.js API routes (same process) can access it
  globalThis.__waClient = waClient;

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Send current status on connect
    const status = waClient.getStatus();
    socket.emit('wa:status', { status: status.status });
    if (status.qr) {
      socket.emit('wa:qr', { qr: status.qr });
    }

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  // Initialize WhatsApp client in background
  waClient.initClient().catch(err => {
    console.error('WA Client init error:', err.message);
  });

  // Let Next.js handle all requests (Express 5 uses /{*path} for wildcard)
  expressApp.all('/{*path}', (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 WhatsApp Messenger → http://localhost:${PORT}`);
    console.log(`🔐 Admin login     → http://localhost:${PORT}/admin/login`);
    console.log(`📱 Waiting for WhatsApp QR scan...\n`);
  });
});
