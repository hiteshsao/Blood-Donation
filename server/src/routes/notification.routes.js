import express from 'express';
import { param, query, body } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
} from '../controllers/notification.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Multi-channel notifications system (IN_APP via Socket.io, EMAIL via Nodemailer, and SMS provider interface)
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get paginated notifications for the logged-in user
 *     description: Returns notifications sorted by creation date with optional unread filter.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: If true, returns only unread notifications
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
 *         description: List of notifications with pagination metadata
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getNotifications);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count for the logged-in user
 *     description: Returns the total number of unread notifications for badge counters.
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   example: 3
 */
router.get('/unread-count', authenticate, getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
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
 *         description: Notification updated to read
 *       404:
 *         description: Notification not found
 */
router.put(
  '/:id/read',
  authenticate,
  [param('id').isMongoId().withMessage('Valid notification ID is required'), validateRequest],
  markAsRead
);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All unread notifications marked as read
 */
router.put('/read-all', authenticate, markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
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
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Valid notification ID is required'), validateRequest],
  deleteNotification
);

/**
 * @swagger
 * /api/v1/notifications/send:
 *   post:
 *     summary: Dispatch a notification via multiple channels (Admin / Internal utility)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Target user ID (defaults to current user if omitted)
 *               type:
 *                 type: string
 *                 example: "EMERGENCY_ALERT"
 *               title:
 *                 type: string
 *                 example: "Critical Blood Request Match"
 *               message:
 *                 type: string
 *                 example: "An urgent O- request is nearby in Raigarh."
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [IN_APP, EMAIL, SMS]
 *                 example: ["IN_APP", "EMAIL", "SMS"]
 *               meta:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notification dispatched across requested channels
 */
router.post(
  '/send',
  authenticate,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    validateRequest,
  ],
  sendNotification
);

export default router;
