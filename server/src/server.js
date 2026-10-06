import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import { swaggerSpec } from './config/swagger.js';
import logger from './config/logger.js';
import { errorHandler } from './middlewares/error.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { sanitizeInput } from './middlewares/sanitize.js';
import { paginationLimiter } from './middlewares/pagination.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import profileRoutes from './routes/profile.routes.js';
import donorRoutes from './routes/donor.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import adminRoutes from './routes/admin.routes.js';
import searchRoutes from './routes/search.routes.js';
import requestRoutes from './routes/request.routes.js';
import emergencyRoutes from './routes/emergency.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import bloodBankRoutes from './routes/bloodbank.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import { authenticate, isAdmin } from './middlewares/auth.js';
import * as adminController from './controllers/admin.controller.js';
import { initInventoryCron } from './jobs/inventory.cron.js';
import { initDonorCron } from './jobs/donor.cron.js';
import { initEmergencyCron } from './jobs/emergency.cron.js';
import { initAppointmentCron } from './jobs/appointment.cron.js';

// Express and HTTP server initialization

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
export const io = initSocket(server);

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Whitelist
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  })
);

// Body and Cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// NoSQL Query Injection Sanitization
app.use(sanitizeInput);

// Centralized Request Logging via Winston
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// Static uploads directory
app.use('/uploads', express.static(path.resolve('uploads')));

// General Rate Limiting
app.use('/api', apiLimiter);

// Global Pagination Limits (max 100 per page, min 1)
app.use('/api', paginationLimiter);

// Swagger Documentation Routes
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get(['/api/docs.json', '/api-docs.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Routes (supporting /api/v1/auth, /api/auth, and /auth for admin login)
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/donor', donorRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/v1/emergency', emergencyRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/hospital', hospitalRoutes);
app.use('/api/hospital', hospitalRoutes);

// Public / verified hospitals listing for requisition dropdowns
app.get(['/api/v1/hospitals', '/api/hospitals'], async (req, res, next) => {
  try {
    const { Hospital } = await import('./models/Hospital.js');
    const hospitals = await Hospital.find({
      $or: [{ isVerified: true }, { verificationStatus: 'VERIFIED' }],
    })
      .select('_id name city state address contact phone email')
      .sort({ name: 1 });
    res.status(200).json({
      success: true,
      hospitals,
    });
  } catch (err) {
    next(err);
  }
});
app.use('/api/v1/bloodbank', bloodBankRoutes);
app.use('/api/bloodbank', bloodBankRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/feedback', feedbackRoutes);

// Direct report export routes (/reports/:type/export)
app.get('/reports/:type/export', authenticate, isAdmin, adminController.exportReport);
app.get('/reports/export', authenticate, isAdmin, adminController.exportReport);
app.get('/api/reports/:type/export', authenticate, isAdmin, adminController.exportReport);
app.get('/api/reports/export', authenticate, isAdmin, adminController.exportReport);
app.get('/reports', authenticate, isAdmin, adminController.getReports);

// 404 Handler
app.use('*', (req, res) => {

  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.execArgv.includes('--test') ||
  process.argv.some((arg) => arg.includes('test'));

// Start Server only outside of automated test runners
if (!isTestEnv) {
  connectDB().then(async () => {
    initInventoryCron();
    initDonorCron();
    initEmergencyCron();
    initAppointmentCron();
    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Blood Donation API running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🔗 Server Address: http://localhost:${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`📡 Socket.io connected and ready`);
      console.log(`======================================================\n`);
    });
  }).catch((err) => {
    console.error('Failed to initialize server:', err.message);
    process.exit(1);
  });
}

// Global error safety handlers
process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('exit', (code) => {
  console.log(`[Process] Server process exiting with code: ${code}`);
});

['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`[Process] Received signal: ${signal}`);
    process.exit(0);
  });
});

export { app, server };


