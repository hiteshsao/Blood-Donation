import express from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  updateAvailability,
  getEligibility,
  getHistory,
  getDashboardStats,
} from '../controllers/donor.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Donor
 *   description: Donor-specific endpoints for availability, eligibility, donation history, and dashboard statistics
 */

/**
 * @swagger
 * /api/v1/donor/availability:
 *   put:
 *     summary: Set donor availability
 *     description: Explicitly set the donor's availability to true or false.
 *     tags: [Donor]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Availability updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: No donor profile found
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/availability',
  authenticate,
  [
    body('isAvailable')
      .isBoolean()
      .withMessage('isAvailable must be true or false'),
    validateRequest,
  ],
  updateAvailability
);

/**
 * @swagger
 * /api/v1/donor/eligibility:
 *   get:
 *     summary: Check real-time donation eligibility
 *     description: >
 *       Computes eligibility using the active EligibilityRule from the database.
 *       Rules: 90-day gap for males, 120-day gap for females, age 18–65, weight >= 50 kg.
 *       Returns `isEligible`, `nextEligibleDate`, `daysRemaining`, and detailed per-check breakdowns.
 *     tags: [Donor]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Eligibility check result with detailed breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isEligible:
 *                   type: boolean
 *                 nextEligibleDate:
 *                   type: string
 *                   format: date-time
 *                 daysRemaining:
 *                   type: integer
 *                 reason:
 *                   type: string
 *                 checks:
 *                   type: object
 *                   properties:
 *                     age:
 *                       type: object
 *                     gap:
 *                       type: object
 *                     weight:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/eligibility', authenticate, getEligibility);

/**
 * @swagger
 * /api/v1/donor/history:
 *   get:
 *     summary: Get paginated donation history
 *     description: Returns the authenticated donor's donation records ordered by most recent, with pagination.
 *     tags: [Donor]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Records per page (max 50)
 *     responses:
 *       200:
 *         description: Paginated donation history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 donations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalDonations:
 *                   type: integer
 *                 totalUnitsDonated:
 *                   type: integer
 *                 lastDonationDate:
 *                   type: string
 *                   format: date-time
 *                 nextEligibleDate:
 *                   type: string
 *                   format: date-time
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/history',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1–50'),
    validateRequest,
  ],
  getHistory
);

/**
 * @swagger
 * /api/v1/donor/dashboard-stats:
 *   get:
 *     summary: Get donor dashboard statistics
 *     description: >
 *       Returns aggregated donor statistics including total donations, units donated,
 *       estimated lives saved, monthly trends (12 months), current eligibility,
 *       and next eligible date.
 *     tags: [Donor]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Donor dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalDonations:
 *                   type: integer
 *                 totalUnitsDonated:
 *                   type: integer
 *                 livesSaved:
 *                   type: integer
 *                 isEligible:
 *                   type: boolean
 *                 nextEligibleDate:
 *                   type: string
 *                   format: date-time
 *                 monthlyTrend:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/dashboard-stats', authenticate, getDashboardStats);

export default router;
