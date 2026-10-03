import express from 'express';
import { param, body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { requireVerifiedBloodBank } from '../middlewares/facilityAuth.middleware.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  getProfile,
  updateProfile,
  getInventory,
  updateGroupStock,
  recordDonation,
  issueUnits,
  getHistory,
} from '../controllers/bloodbank.controller.js';

const router = express.Router();

// All blood bank routes require authentication and VERIFIED blood bank status
router.use(authenticate, requireVerifiedBloodBank);

/**
 * @swagger
 * tags:
 *   name: BloodBank
 *   description: Verified Blood Bank Management Portal endpoints (/api/v1/bloodbank)
 */

/**
 * @swagger
 * /api/v1/bloodbank/profile:
 *   get:
 *     summary: Retrieve verified blood bank profile
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Blood Bank profile retrieved
 *       403:
 *         description: Forbidden - Blood Bank pending verification
 *   put:
 *     summary: Update blood bank profile details
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Blood Bank profile updated
 */
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

/**
 * @swagger
 * /api/v1/bloodbank/inventory:
 *   get:
 *     summary: Retrieve complete inventory breakdown across all 8 blood groups
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory grid with available, reserved, and expired counts
 */
router.get('/inventory', getInventory);

/**
 * @swagger
 * /api/v1/bloodbank/inventory/{group}:
 *   put:
 *     summary: Update, add, or remove stock for a specific blood group (transaction-backed, non-negative)
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *           example: "O+"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ADD, REMOVE, SET]
 *               units:
 *                 type: number
 *               available:
 *                 type: number
 *               reserved:
 *                 type: number
 *               expired:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Invalid group or negative stock prevented
 */
router.put('/inventory/:group', updateGroupStock);

/**
 * @swagger
 * /api/v1/bloodbank/donations:
 *   post:
 *     summary: Record an incoming donation linked to donor and optional appointment
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [donorId]
 *             properties:
 *               donorId:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               bloodGroup:
 *                 type: string
 *                 example: "O+"
 *               units:
 *                 type: number
 *                 default: 1
 *     responses:
 *       201:
 *         description: Donation recorded and inventory incremented
 */
router.post(
  '/donations',
  [body('donorId').isMongoId().withMessage('Valid donorId is required'), validateRequest],
  recordDonation
);

/**
 * @swagger
 * /api/v1/bloodbank/issue:
 *   post:
 *     summary: Record issued blood units linked to an approved/fulfilled blood request
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId]
 *             properties:
 *               requestId:
 *                 type: string
 *               bloodGroup:
 *                 type: string
 *               units:
 *                 type: number
 *                 default: 1
 *               issuedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Units issued and inventory decremented
 *       400:
 *         description: Insufficient stock
 */
router.post(
  '/issue',
  [body('requestId').isMongoId().withMessage('Valid requestId is required'), validateRequest],
  issueUnits
);

/**
 * @swagger
 * /api/v1/bloodbank/history:
 *   get:
 *     summary: Retrieve unified paginated timeline of donations and issued units
 *     tags: [BloodBank]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ALL, DONATION, ISSUE]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Combined activity history
 */
router.get('/history', getHistory);

export default router;
