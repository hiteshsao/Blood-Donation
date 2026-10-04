import express from 'express';
import { body, query, param } from 'express-validator';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  getSlots,
  book,
  reschedule,
  cancel,
  getMy,
  getBankAppointments,
  complete,
  noShow,
  triggerReminders,
} from '../controllers/appointment.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Appointments
 *   description: Voluntary blood donation appointment scheduling, slot management, rescheduling, cancellations, and blood bank fulfillment
 */

/**
 * @swagger
 * /api/v1/appointments/slots:
 *   get:
 *     summary: Get available appointment slots for a blood bank on a given date
 *     description: >
 *       Returns standard time slots with current booked count, remaining capacity,
 *       and availability status.
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: bloodBankId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the target blood bank
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-10-05"
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: maxPerSlot
 *         required: false
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Maximum donors allowed per time slot
 *     responses:
 *       200:
 *         description: Available slots successfully retrieved
 *       400:
 *         description: Missing required query parameters or invalid date format
 *       404:
 *         description: Blood bank not found
 */
router.get(
  '/slots',
  [
    query('bloodBankId').notEmpty().withMessage('bloodBankId is required'),
    query('date').notEmpty().withMessage('date is required (YYYY-MM-DD)'),
    validateRequest,
  ],
  getSlots
);

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     summary: Book a blood donation appointment
 *     description: >
 *       Books an appointment for an authenticated donor. Enforces donor eligibility
 *       (checks age 18-65, weight >= 50kg, and mandatory donation gap: 90 days for males, 120 days for females).
 *       Guarantees prevention of double-booking on the same date and verifies slot capacity.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bloodBankId
 *               - slotDate
 *               - slotTime
 *             properties:
 *               bloodBankId:
 *                 type: string
 *                 description: Target Blood Bank ID
 *               slotDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-05"
 *               slotTime:
 *                 type: string
 *                 example: "10:00 AM - 11:00 AM"
 *               notes:
 *                 type: string
 *                 example: "First time donor"
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *       400:
 *         description: Donor is not eligible, slot is full, or invalid input
 *       404:
 *         description: Blood bank not found
 *       409:
 *         description: Donor already has an active appointment scheduled on this date
 */
router.post(
  '/',
  authenticate,
  [
    body('bloodBankId')
      .optional()
      .custom((value, { req }) => {
        if (!value && !req.body.bloodBank) {
          throw new Error('bloodBankId or bloodBank is required');
        }
        return true;
      }),
    body('slotDate')
      .optional()
      .custom((value, { req }) => {
        if (!value && !req.body.appointmentDate) {
          throw new Error('slotDate or appointmentDate is required');
        }
        return true;
      }),
    body('slotTime')
      .optional()
      .custom((value, { req }) => {
        if (!value && !req.body.timeSlot) {
          throw new Error('slotTime or timeSlot is required');
        }
        return true;
      }),
    validateRequest,
  ],
  book
);

/**
 * @swagger
 * /api/v1/appointments/my:
 *   get:
 *     summary: Get appointments for the authenticated donor
 *     description: Returns paginated appointments belonging to the logged-in user.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BOOKED, RESCHEDULED, COMPLETED, CANCELLED, NO_SHOW, ALL]
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
 *         description: Donor appointments list returned
 */
router.get('/my', authenticate, authorize('USER', 'DONOR', 'ADMIN'), getMy);

/**
 * @swagger
 * /api/v1/appointments/bank:
 *   get:
 *     summary: Get all appointments for a Blood Bank facility
 *     description: >
 *       Accessible by users with the BLOOD_BANK role (or ADMIN). Returns all donor bookings
 *       for their associated blood bank, with optional date and status filters.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Blood bank appointments list returned
 *       403:
 *         description: Access denied (must have BLOOD_BANK or ADMIN role)
 */
router.get(
  '/bank',
  authenticate,
  authorize('BLOOD_BANK', 'ADMIN'),
  getBankAppointments
);

/**
 * @swagger
 * /api/v1/appointments/trigger-reminders:
 *   post:
 *     summary: Manually trigger 24h appointment reminder sweep
 *     description: Finds appointments within the next 24 hours and dispatches notifications.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reminders dispatched
 */
router.post(
  '/trigger-reminders',
  authenticate,
  authorize('ADMIN', 'BLOOD_BANK'),
  triggerReminders
);

/**
 * @swagger
 * /api/v1/appointments/{id}/reschedule:
 *   put:
 *     summary: Reschedule an active appointment
 *     description: >
 *       Updates slotDate and slotTime of a BOOKED or RESCHEDULED appointment.
 *       Verifies capacity in the target slot and resets reminder state.
 *     tags: [Appointments]
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
 *               - slotDate
 *               - slotTime
 *             properties:
 *               slotDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-08"
 *               slotTime:
 *                 type: string
 *                 example: "11:00 AM - 12:00 PM"
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *       400:
 *         description: Appointment cannot be rescheduled or slot full
 *       404:
 *         description: Appointment not found
 *       409:
 *         description: Conflict with existing booking on target date
 */
router.put(
  '/:id/reschedule',
  authenticate,
  [
    param('id').isMongoId().withMessage('Valid appointment ID is required'),
    validateRequest,
  ],
  reschedule
);

/**
 * @swagger
 * /api/v1/appointments/{id}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     description: Marks appointment as CANCELLED with an optional cancellation reason.
 *     tags: [Appointments]
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
 *               cancellationReason:
 *                 type: string
 *                 example: "Personal scheduling conflict"
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       400:
 *         description: Already completed or cancelled
 *       404:
 *         description: Appointment not found
 */
router.put(
  '/:id/cancel',
  authenticate,
  [
    param('id').isMongoId().withMessage('Valid appointment ID is required'),
    validateRequest,
  ],
  cancel
);

/**
 * @swagger
 * /api/v1/appointments/{id}/complete:
 *   put:
 *     summary: Mark appointment completed and record donation (Blood Bank)
 *     description: >
 *       For BLOOD_BANK / ADMIN role. Atomically creates a Donation record, updates the
 *       donor's lastDonationDate & nextEligibleDate (90 days for male, 120 days for female),
 *       and increments Inventory.available for that blood group within a MongoDB transaction.
 *     tags: [Appointments]
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
 *               units:
 *                 type: number
 *                 default: 1
 *                 example: 1
 *               remarks:
 *                 type: string
 *                 example: "Healthy donation completed"
 *               certificateUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment completed, donation saved, and inventory incremented
 *       400:
 *         description: Invalid state transition
 *       403:
 *         description: Unauthorized facility access
 *       404:
 *         description: Appointment not found
 */
router.put(
  '/:id/complete',
  authenticate,
  authorize('BLOOD_BANK', 'ADMIN'),
  [
    param('id').isMongoId().withMessage('Valid appointment ID is required'),
    validateRequest,
  ],
  complete
);

/**
 * @swagger
 * /api/v1/appointments/{id}/no-show:
 *   put:
 *     summary: Mark donor as no-show for appointment (Blood Bank)
 *     description: Accessible by BLOOD_BANK and ADMIN roles. Updates status to NO_SHOW.
 *     tags: [Appointments]
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
 *         description: Appointment marked as NO_SHOW
 *       400:
 *         description: Invalid state transition
 *       404:
 *         description: Appointment not found
 */
router.put(
  '/:id/no-show',
  authenticate,
  authorize('BLOOD_BANK', 'ADMIN'),
  [
    param('id').isMongoId().withMessage('Valid appointment ID is required'),
    validateRequest,
  ],
  noShow
);

export default router;
