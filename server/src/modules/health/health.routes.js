import { Router } from 'express';
import { getHealthStatus } from './health.controller.js';

const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: System Health Check
 *     description: Returns the real-time operational status of the API, MongoDB connection, uptime, and server diagnostics.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is operational and healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: System is healthy and operational
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       example: 2026-09-28T07:20:00.000Z
 *                     uptime:
 *                       type: string
 *                       example: 45s
 *                     environment:
 *                       type: string
 *                       example: development
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: connected
 *                         name:
 *                           type: string
 *                           example: blood_donation_db
 */
router.get('/', getHealthStatus);

export default router;
