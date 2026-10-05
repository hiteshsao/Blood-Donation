import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Socket.io connection lifecycle
io.on('connection', (socket) => {
  console.log(`[Socket.io]: Client connected: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`[Socket.io]: Client ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io]: Client disconnected: ${socket.id}`);
  });
});

// Make io accessible globally or attach to app
app.set('io', io);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    server.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Blood Donation Server running in [${env.NODE_ENV}] mode`);
      console.log(`📡 URL: http://localhost:${env.PORT}`);
      console.log(`📖 Swagger API Docs: http://localhost:${env.PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${env.PORT}/api/v1/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP and Socket server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown after timeout...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at]:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]:', error);
  process.exit(1);
});

startServer();

export { server, io };
