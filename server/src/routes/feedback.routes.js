import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  submitFeedback,
  getMyFeedbacks,
  getFeedbackById,
  addReply,
  updateStatus,
} from '../controllers/feedback.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: User feedback, complaints, follow-up replies, and administrative resolutions (/api/v1/feedback)
 */

/**
 * @swagger
 * /api/v1/feedback:
 *   post:
 *     summary: Submit feedback or register a complaint
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [FEEDBACK, COMPLAINT]
 *                 default: FEEDBACK
 *               category:
 *                 type: string
 *                 enum: [GENERAL, SERVICE, DONATION_EXPERIENCE, APP_ISSUE, HOSPITAL, BLOOD_BANK, DELAY, STAFF_BEHAVIOR, OTHER]
 *               subject:
 *                 type: string
 *                 example: "Great experience donating blood"
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *                 example: "Staff was very professional and the procedure was smooth."
 *               description:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 5
 *     responses:
 *       201:
 *         description: Feedback/complaint created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  [
    body('subject')
      .optional()
      .trim(),
    body('title')
      .optional()
      .trim(),
    body('message')
      .optional()
      .trim(),
    body('description')
      .optional()
      .trim(),
    (req, res, next) => {
      const subject = req.body.subject || req.body.title;
      const message = req.body.message || req.body.description;
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Subject or title is required.' });
      }
      if (!message) {
        return res.status(400).json({ success: false, message: 'Message or description is required.' });
      }
      next();
    },
    validateRequest,
  ],
  submitFeedback
);

/**
 * @swagger
 * /api/v1/feedback/my:
 *   get:
 *     summary: Get paginated feedback and complaints submitted by the authenticated user
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [FEEDBACK, COMPLAINT]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of user submissions with pagination
 */
router.get('/my', authenticate, getMyFeedbacks);

/**
 * @swagger
 * /api/v1/feedback/{id}:
 *   get:
 *     summary: Get single feedback ticket with full conversation thread (admin responses and user follow-ups)
 *     tags: [Feedback]
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
 *         description: Feedback ticket and conversation details
 *       403:
 *         description: Forbidden - Not author or admin
 *       404:
 *         description: Ticket not found
 */
router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Valid feedback ID is required'), validateRequest],
  getFeedbackById
);

/**
 * @swagger
 * /api/v1/feedback/{id}/reply:
 *   post:
 *     summary: Submit a follow-up reply to feedback thread (Notifies user if admin replies)
 *     tags: [Feedback]
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
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *               statusChange:
 *                 type: string
 *                 enum: [IN_REVIEW, IN_PROGRESS, RESOLVED, CLOSED]
 *               resolutionNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply added and thread updated
 */
router.post(
  '/:id/reply',
  authenticate,
  [
    param('id').isMongoId().withMessage('Valid feedback ID is required'),
    body('message').trim().notEmpty().withMessage('Reply message is required.'),
    validateRequest,
  ],
  addReply
);

/**
 * @swagger
 * /api/v1/feedback/{id}/status:
 *   put:
 *     summary: Admin update status of a feedback or complaint ticket (Notifies user via In-App and Email)
 *     tags: [Feedback]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_REVIEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED]
 *               resolutionNote:
 *                 type: string
 *               adminMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated and user notified
 */
router.put(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  [
    param('id').isMongoId().withMessage('Valid feedback ID is required'),
    body('status')
      .isIn(['OPEN', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
      .withMessage('Valid status is required.'),
    validateRequest,
  ],
  updateStatus
);

export default router;
