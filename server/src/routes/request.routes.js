import express from 'express';
import { body, query, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  createRequest,
  getMyRequests,
  getRequestById,
  cancelRequest,
  confirmReceivedUnits,
  updateStatus,
} from '../controllers/request.controller.js';

const router = express.Router();

const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const validUrgencies = ['ROUTINE', 'URGENT', 'CRITICAL', 'NORMAL', 'EMERGENCY'];
const validStatuses = [
  'PENDING',
  'APPROVED',
  'DONOR_ASSIGNED',
  'IN_PROGRESS',
  'FULFILLED',
  'REJECTED',
  'CANCELLED',
];

/**
 * @swagger
 * tags:
 *   name: Blood Requests
 *   description: Blood request creation, state machine transitions, cancellation, and hospital fulfillment confirmation
 */

/**
 * @swagger
 * /api/v1/requests:
 *   post:
 *     summary: Create a new blood request
 *     description: >
 *       Users or Hospitals can create a blood request. If the authenticated user has the
 *       `HOSPITAL` role, their `hospitalId` and `hospitalName` are automatically linked.
 *       Initializes status to PENDING and registers an initial statusHistory entry.
 *       Triggers an in-app notification to the requester.
 *     tags: [Blood Requests]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientName
 *               - bloodGroup
 *               - units
 *               - city
 *             properties:
 *               patientName:
 *                 type: string
 *                 example: Ramesh Gupta
 *               bloodGroup:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: O+
 *               units:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               urgency:
 *                 type: string
 *                 enum: [ROUTINE, URGENT, CRITICAL, NORMAL, EMERGENCY]
 *                 default: ROUTINE
 *                 example: URGENT
 *               contactNumber:
 *                 type: string
 *                 example: "9876543210"
 *               hospitalId:
 *                 type: string
 *                 description: Optional hospital ID (auto-linked for hospital role)
 *               hospitalName:
 *                 type: string
 *                 example: Lilavati Hospital
 *               notes:
 *                 type: string
 *                 example: Patient scheduled for open-heart surgery
 *               location:
 *                 type: object
 *                 description: GeoJSON point or {lat, lng} coordinates
 *     responses:
 *       201:
 *         description: Blood request created successfully (Status PENDING)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticate,
  [
    body('patientName').trim().notEmpty().withMessage('Patient name is required'),
    body('bloodGroup')
      .trim()
      .toUpperCase()
      .isIn(validBloodGroups)
      .withMessage(`bloodGroup must be one of: ${validBloodGroups.join(', ')}`),
    body('units')
      .isInt({ min: 1 })
      .withMessage('Units must be a positive integer (min 1)'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('urgency')
      .optional()
      .trim()
      .toUpperCase()
      .isIn(validUrgencies)
      .withMessage(`urgency must be one of: ${validUrgencies.join(', ')}`),
    body('hospitalName').optional().trim(),
    body('contactNumber').optional().trim(),
    body('contactPhone').optional().trim(),
    body('donorId').optional().trim(),
    body('targetedDonor').optional().trim(),
    body('notes').optional().trim(),
    validateRequest,
  ],
  createRequest
);

/**
 * @swagger
 * /api/v1/requests/my:
 *   get:
 *     summary: Get requests for current authenticated user or hospital
 *     description: Returns paginated requests created by the user or assigned to the hospital.
 *     tags: [Blood Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, DONOR_ASSIGNED, IN_PROGRESS, FULFILLED, REJECTED, CANCELLED]
 *         description: Filter by status
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [ROUTINE, URGENT, CRITICAL, NORMAL, EMERGENCY]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated blood requests list
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my',
  authenticate,
  [
    query('status')
      .optional()
      .trim()
      .toUpperCase()
      .isIn(validStatuses)
      .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
    query('urgency')
      .optional()
      .trim()
      .toUpperCase()
      .isIn(validUrgencies)
      .withMessage(`urgency must be one of: ${validUrgencies.join(', ')}`),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    validateRequest,
  ],
  getMyRequests
);

/**
 * @swagger
 * /api/v1/requests/{id}:
 *   get:
 *     summary: Get blood request details with complete statusHistory
 *     description: >
 *       Returns complete request document including populated requester, hospital,
 *       assigned donors, and complete chronological statusHistory array.
 *     tags: [Blood Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ObjectId
 *     responses:
 *       200:
 *         description: Blood request details with status history
 *       403:
 *         description: Forbidden – not authorized to view this request
 *       404:
 *         description: Request not found
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid request ID format'),
    validateRequest,
  ],
  getRequestById
);

/**
 * @swagger
 * /api/v1/requests/{id}/cancel:
 *   put:
 *     summary: Cancel a blood request
 *     description: >
 *       Cancels a blood request. Enforces state machine: can only cancel from
 *       PENDING, APPROVED, DONOR_ASSIGNED, or IN_PROGRESS. Throws error if already
 *       FULFILLED, CANCELLED, or REJECTED.
 *       Appends CANCELLED entry to statusHistory and triggers a notification to the requester.
 *     tags: [Blood Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Patient received blood from another donor
 *     responses:
 *       200:
 *         description: Request cancelled successfully
 *       400:
 *         description: Invalid state transition
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Request not found
 */
router.put(
  '/:id/cancel',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid request ID format'),
    body('reason').optional().trim(),
    validateRequest,
  ],
  cancelRequest
);

/**
 * @swagger
 * /api/v1/requests/{id}/confirm-received:
 *   post:
 *     summary: Hospital confirms units received, fulfilling request
 *     description: >
 *       Called by hospital staff to confirm units have been received.
 *       Transitions request status to FULFILLED, appends to statusHistory,
 *       and triggers a notification to the requester.
 *     tags: [Blood Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unitsReceived:
 *                 type: integer
 *                 example: 2
 *               note:
 *                 type: string
 *                 example: Cross-matched and transfused successfully
 *     responses:
 *       200:
 *         description: Units confirmed and request marked FULFILLED
 *       400:
 *         description: Invalid state transition
 *       403:
 *         description: Forbidden – only hospital role or admin allowed
 *       404:
 *         description: Request not found
 */
router.post(
  '/:id/confirm-received',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid request ID format'),
    body('unitsReceived').optional().isInt({ min: 1 }),
    body('note').optional().trim(),
    validateRequest,
  ],
  confirmReceivedUnits
);

router.put(
  '/:id/confirm-received',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid request ID format'),
    body('unitsReceived').optional().isInt({ min: 1 }),
    body('note').optional().trim(),
    validateRequest,
  ],
  confirmReceivedUnits
);

/**
 * @swagger
 * /api/v1/requests/{id}/status:
 *   patch:
 *     summary: Transition request status through state machine
 *     description: >
 *       Advances or updates status according to state machine:
 *       PENDING -> APPROVED -> DONOR_ASSIGNED -> IN_PROGRESS -> FULFILLED (or REJECTED / CANCELLED).
 *       Invalid transitions throw 400 errors.
 *       Records change in statusHistory and triggers in-app notification to requester.
 *     tags: [Blood Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, DONOR_ASSIGNED, IN_PROGRESS, FULFILLED, REJECTED, CANCELLED]
 *               note:
 *                 type: string
 *                 example: Doctor verified patient requirements
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid state transition
 *       404:
 *         description: Request not found
 */
router.patch(
  '/:id/status',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid request ID format'),
    body('status')
      .trim()
      .toUpperCase()
      .isIn(validStatuses)
      .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
    body('note').optional().trim(),
    validateRequest,
  ],
  updateStatus
);

export default router;
