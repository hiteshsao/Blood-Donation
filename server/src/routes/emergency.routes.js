import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  createEmergency,
  getNearby,
  respond,
  confirmDonated,
  getMyEmergenciesHandler,
  getProgress,
  triggerEscalation,
} from '../controllers/emergency.controller.js';

const router = express.Router();

const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * @swagger
 * tags:
 *   name: Emergency
 *   description: Real-time emergency blood broadcast, automated compatibility matching, donor response, and auto-escalation
 */

/**
 * @swagger
 * /api/v1/emergency:
 *   post:
 *     summary: Create an emergency blood request with auto-matching and multi-channel notification
 *     description: >
 *       Creates an emergency blood broadcast. Automatically queries verified, available,
 *       and eligible voluntary donors of compatible blood groups within the specified radius (default 15 km).
 *       Alerts matched donors simultaneously via In-App Notification, Email, and real-time Socket.io events.
 *       Schedules automatic radius escalation if not enough acceptances are received within 15 minutes.
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bloodGroup
 *               - units
 *             properties:
 *               bloodGroup:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: O+
 *               units:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               patientName:
 *                 type: string
 *                 example: Priya Desai
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               radiusKm:
 *                 type: number
 *                 default: 15
 *                 example: 15
 *               hospitalId:
 *                 type: string
 *               hospitalName:
 *                 type: string
 *                 example: Nanavati Max Super Speciality Hospital
 *               notes:
 *                 type: string
 *                 example: Emergency trauma ICU admission
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: 19.076
 *                   lng:
 *                     type: number
 *                     example: 72.8777
 *     responses:
 *       201:
 *         description: Emergency request created and donors alerted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  [
    body('bloodGroup')
      .trim()
      .toUpperCase()
      .isIn(validBloodGroups)
      .withMessage(`bloodGroup must be one of: ${validBloodGroups.join(', ')}`),
    body('units')
      .isInt({ min: 1 })
      .withMessage('units must be a positive integer >= 1'),
    body('patientName').optional().trim(),
    body('city').optional().trim(),
    body('radiusKm').optional().isFloat({ min: 1, max: 150 }),
    validateRequest,
  ],
  createEmergency
);

/**
 * @swagger
 * /api/v1/emergency/nearby:
 *   get:
 *     summary: Get pending/active emergency broadcasts compatible with authenticated donor
 *     description: >
 *       For registered donors: returns active emergencies where the patient's blood group
 *       is biologically compatible with the donor's blood type and within proximity.
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of nearby compatible emergency requests
 *       401:
 *         description: Unauthorized
 */
router.get('/nearby', authenticate, getNearby);

/**
 * @swagger
 * /api/v1/emergency/my:
 *   get:
 *     summary: Get emergency requests created by authenticated user or hospital with fulfillment progress
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of emergency broadcasts created by the user
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, getMyEmergenciesHandler);

/**
 * @swagger
 * /api/v1/emergency/{id}/respond:
 *   post:
 *     summary: Donor responds to an emergency request (ACCEPTED or REJECTED)
 *     description: >
 *       Allows an alerted donor to accept or decline an emergency request.
 *       When accepted donors count reaches or exceeds units needed, the emergency is
 *       automatically marked as FULFILLED, updating the status and notifying the requester.
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: EmergencyRequest ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *                 example: ACCEPTED
 *     responses:
 *       200:
 *         description: Response recorded and fulfillment status updated
 *       400:
 *         description: Invalid response value or request already closed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Emergency request not found
 */
router.post(
  '/:id/respond',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid emergency ID format'),
    body('response')
      .trim()
      .toUpperCase()
      .isIn(['ACCEPTED', 'REJECTED'])
      .withMessage('response must be either ACCEPTED or REJECTED'),
    validateRequest,
  ],
  respond
);

/**
 * @swagger
 * /api/v1/emergency/{id}/progress:
 *   get:
 *     summary: Get emergency fulfillment progress (units needed vs accepted)
 *     description: >
 *       Returns real-time progress statistics: total units required, accepted donor count,
 *       pending notifications, rejected count, current search radius, and masked donor list.
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: EmergencyRequest ObjectId
 *     responses:
 *       200:
 *         description: Emergency fulfillment progress metrics
 *       404:
 *         description: Emergency request not found
 */
router.get(
  '/:id/progress',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid emergency ID format'),
    validateRequest,
  ],
  getProgress
);

/**
 * @swagger
 * /api/v1/emergency/{id}/escalate:
 *   post:
 *     summary: Trigger manual or scheduled escalation of emergency search radius
 *     description: >
 *       Widens search radius by 15 km, discovers newly reachable compatible donors,
 *       and dispatches emergency alerts to them.
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search radius widened and new donors alerted
 *       400:
 *         description: Cannot escalate (already fulfilled or closed)
 */
router.post(
  '/:id/escalate',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid emergency ID format'),
    validateRequest,
  ],
  triggerEscalation
);

/**
 * @swagger
 * /api/v1/emergency/{id}/donors/{donorId}/confirm-donated:
 *   post:
 *     summary: Confirm donor completed their emergency blood donation
 *     description: >
 *       Allows the emergency requester, linked hospital user, or ADMIN to confirm that an
 *       accepted donor completed their blood donation.
 *       Creates a verified Donation record, updates the donor's lastDonationDate & nextEligibleDate
 *       (eligibility lock: 90 days for male, 120 days for female), and if all required units are donated,
 *       marks the emergency request and linked BloodRequest as FULFILLED.
 *       A donor cannot confirm their own donation.
 *     tags: [Emergency]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: EmergencyRequest ObjectId
 *       - in: path
 *         name: donorId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ObjectId of the donor
 *     responses:
 *       200:
 *         description: Donation confirmed and fulfillment evaluated
 *       400:
 *         description: Donor not accepted or already confirmed
 *       403:
 *         description: Unauthorized (donor confirming self or unauthorized requester)
 *       404:
 *         description: Emergency request or donor not found
 */
router.post(
  '/:id/donors/:donorId/confirm-donated',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid emergency ID format'),
    param('donorId').isMongoId().withMessage('Invalid donor ID format'),
    validateRequest,
  ],
  confirmDonated
);

export default router;
