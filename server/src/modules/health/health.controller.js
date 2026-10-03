import mongoose from 'mongoose';
import { ApiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { env } from '../../config/env.js';

/**
 * @desc Get system health and uptime status
 * @route GET /api/v1/health
 * @access Public
 */
export const getHealthStatus = asyncHandler(async (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: env.NODE_ENV,
    database: {
      status: dbStatusMap[mongoose.connection.readyState] || 'unknown',
      name: mongoose.connection.name || 'blood_donation_db',
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
    },
  };

  return new ApiResponse(200, healthData, 'System is healthy and operational').send(res);
});
