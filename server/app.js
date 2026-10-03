import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import { env } from './src/config/env.js';
import { setupSwagger } from './src/docs/swagger.js';
import healthRoutes from './src/modules/health/health.routes.js';
import { notFound } from './src/middleware/notFound.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and external assets in dev
    crossOriginEmbedderPolicy: false,
  })
);

// Cross Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching CLIENT_URL
      if (!origin || origin === env.CLIENT_URL || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
  })
);

// HTTP request logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', limiter);

// Swagger API Documentation
setupSwagger(app);

// Mount API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);

// Root route redirects to Swagger docs or health
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;
