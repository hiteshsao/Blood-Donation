import express from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, isAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import * as adminController from '../controllers/admin.controller.js';
import {
  getAuditLogs,
  getDistinctActions,
  getAuditLogById,
} from '../controllers/auditLog.controller.js';

const router = express.Router();

// Enforce authentication & ADMIN role globally on all /api/v1/admin/* routes
router.use(authenticate, isAdmin);

/**
 * @swagger
 * tags:
 *   - name: Admin – Dashboard
 *     description: Administrative metrics and overview
 *   - name: Admin – Users
 *     description: System user management, verification, blocking, and soft deletion
 *   - name: Admin – Donors
 *     description: Donor management, medical board verification, and blocking
 *   - name: Admin – Facilities
 *     description: Hospital and Blood Bank pending approvals, verification, and blocking
 *   - name: Admin – Inventory
 *     description: Blood inventory oversight, overrides, and low-stock monitoring
 *   - name: Admin – Requests
 *     description: Blood request oversight, state machine transitions, and donor assignment
 *   - name: Admin – Emergency
 *     description: Live emergency monitoring, donor coordination, and escalations
 *   - name: Admin – Donations
 *     description: Completed donation records and official certification
 *   - name: Admin – Broadcast
 *     description: System-wide and targeted multi-channel announcements
 *   - name: Admin – Complaints
 *     description: Grievance and ticket assignment, responses, and resolution
 *   - name: Admin – Audit Logs
 *     description: Immutable system audit logs and action tracking
 *   - name: Admin – Reports
 *     description: System-wide clinical reports, aggregation analytics, and PDF/Excel streaming export
 */


// ──────────────────────────────────────────────────────────
// 1. DASHBOARD STATS
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get administrative overview metrics and statistics
 *     tags: [Admin – Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics (totals, pending approvals, active emergencies, monthly donations, stock by group)
 */
router.get('/stats', adminController.getDashboardStats);
router.get('/dashboard/stats', adminController.getDashboardStats);

// ──────────────────────────────────────────────────────────
// 2. USERS MANAGEMENT
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List and search users with pagination and filters
 *     tags: [Admin – Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, phone, or city
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, DONOR, HOSPITAL, BLOOD_BANK, ADMIN]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, BLOCKED, PENDING]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
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
 *         description: Paginated users list
 */
router.get('/users', adminController.getUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}/verify:
 *   put:
 *     summary: Verify a user
 *     tags: [Admin – Users]
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
 *         description: User marked as verified
 */
router.put('/users/:id/verify', adminController.verifyUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/block:
 *   put:
 *     summary: Block/suspend a user account
 *     tags: [Admin – Users]
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
 *     responses:
 *       200:
 *         description: User blocked successfully
 */
router.put('/users/:id/block', adminController.blockUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/unblock:
 *   put:
 *     summary: Unblock a suspended user account
 *     tags: [Admin – Users]
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
 *         description: User unblocked successfully
 */
router.put('/users/:id/unblock', adminController.unblockUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Soft delete a user
 *     tags: [Admin – Users]
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
 *         description: User soft deleted successfully
 */
router.delete('/users/:id', adminController.deleteUser);

// ──────────────────────────────────────────────────────────
// 3. DONORS MANAGEMENT
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/donors:
 *   get:
 *     summary: List and search donors with pagination and filters
 *     tags: [Admin – Donors]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, VERIFIED, REJECTED]
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: city
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
 *         description: Paginated donors list
 */
router.get('/donors', adminController.getDonors);

/**
 * @swagger
 * /api/v1/admin/donors/{id}/verify:
 *   put:
 *     summary: Approve or reject donor medical verification
 *     tags: [Admin – Donors]
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
 *               approve:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Donor verification updated
 */
router.put('/donors/:id/verify', adminController.verifyDonor);
router.put('/donors/:id/approve', adminController.approveDonor);
router.put('/donors/:id/reject', adminController.rejectDonor);

/**
 * @swagger
 * /api/v1/admin/donors/{id}/block:
 *   put:
 *     summary: Block donor profile and suspend donor account
 *     tags: [Admin – Donors]
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
 *     responses:
 *       200:
 *         description: Donor blocked successfully
 */
router.put('/donors/:id/block', adminController.blockDonor);

// ──────────────────────────────────────────────────────────
// 4. HOSPITALS & BLOOD BANKS (FACILITIES)
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/facilities/pending:
 *   get:
 *     summary: List pending hospital and blood bank registration applications
 *     tags: [Admin – Facilities]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending hospitals and blood banks
 */
router.get('/facilities/pending', adminController.getPendingFacilities);
router.get('/hospitals/pending', async (req, res, next) => {
  try {
    const pending = await adminController.getPendingFacilities(req, res, next);
  } catch (e) {
    next(e);
  }
});
router.get('/bloodbanks/pending', async (req, res, next) => {
  try {
    const pending = await adminController.getPendingFacilities(req, res, next);
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /api/v1/admin/hospitals:
 *   get:
 *     summary: List and search hospitals
 *     tags: [Admin – Facilities]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated hospitals list
 */
router.get('/hospitals', adminController.getHospitals);

/**
 * @swagger
 * /api/v1/admin/bloodbanks:
 *   get:
 *     summary: List and search blood banks
 *     tags: [Admin – Facilities]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated blood banks list
 */
router.get('/bloodbanks', adminController.getBloodBanks);

/**
 * @swagger
 * /api/v1/admin/facilities/{facilityType}/{id}/verify:
 *   put:
 *     summary: Approve, reject, or block a facility (with email notification)
 *     tags: [Admin – Facilities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: facilityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hospitals, bloodbanks, HOSPITAL, BLOOD_BANK]
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
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVE, REJECT, BLOCK]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Facility verification updated and applicant notified via email
 */
router.put('/facilities/:facilityType/:id/verify', adminController.verifyFacility);
router.put('/hospitals/:id/verify', adminController.updateHospitalVerification);
router.put('/hospitals/:id/approve', (req, res, next) => {
  req.body.decision = 'APPROVE';
  return adminController.updateHospitalVerification(req, res, next);
});
router.put('/hospitals/:id/reject', (req, res, next) => {
  req.body.decision = 'REJECT';
  return adminController.updateHospitalVerification(req, res, next);
});
router.put('/hospitals/:id/block', (req, res, next) => {
  req.body.decision = 'BLOCK';
  return adminController.updateHospitalVerification(req, res, next);
});

router.put('/bloodbanks/:id/verify', adminController.updateBloodBankVerification);
router.put('/bloodbanks/:id/approve', (req, res, next) => {
  req.body.decision = 'APPROVE';
  return adminController.updateBloodBankVerification(req, res, next);
});
router.put('/bloodbanks/:id/reject', (req, res, next) => {
  req.body.decision = 'REJECT';
  return adminController.updateBloodBankVerification(req, res, next);
});
router.put('/bloodbanks/:id/block', (req, res, next) => {
  req.body.decision = 'BLOCK';
  return adminController.updateBloodBankVerification(req, res, next);
});

// ──────────────────────────────────────────────────────────
// 5. INVENTORY MANAGEMENT
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/inventory:
 *   get:
 *     summary: View inventory across all blood banks
 *     tags: [Admin – Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory summary per bank
 */
router.get('/inventory', adminController.getAllInventories);

/**
 * @swagger
 * /api/v1/admin/inventory/low-stock:
 *   get:
 *     summary: Get low stock units across all banks
 *     tags: [Admin – Inventory]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of items with stock at or below threshold
 */
router.get('/inventory/low-stock', adminController.getLowStock);

/**
 * @swagger
 * /api/v1/admin/inventory/{bankId}/{group}:
 *   put:
 *     summary: Override, add, update, or remove blood inventory stock
 *     tags: [Admin – Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: group
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, units]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ADD, REMOVE, SET, OVERRIDE]
 *               units:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock updated and mutation audit-logged
 */
router.put('/inventory/:bankId/:group', adminController.overrideStock);

// ──────────────────────────────────────────────────────────
// 6. REQUESTS MANAGEMENT
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/requests:
 *   get:
 *     summary: List and search blood requests with pagination and filters
 *     tags: [Admin – Requests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, DONOR_ASSIGNED, IN_PROGRESS, FULFILLED, REJECTED, CANCELLED]
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [CRITICAL, URGENT, NORMAL]
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
 *         description: Paginated blood requests
 */
router.get('/requests', adminController.getRequests);

/**
 * @swagger
 * /api/v1/admin/requests/{id}/approve:
 *   put:
 *     summary: Approve a blood request
 *     tags: [Admin – Requests]
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
 *         description: Request approved
 */
router.put('/requests/:id/approve', adminController.approveRequest);

/**
 * @swagger
 * /api/v1/admin/requests/{id}/reject:
 *   put:
 *     summary: Reject a blood request
 *     tags: [Admin – Requests]
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
 *     responses:
 *       200:
 *         description: Request rejected
 */
router.put('/requests/:id/reject', adminController.rejectRequest);

/**
 * @swagger
 * /api/v1/admin/requests/{id}/assign:
 *   put:
 *     summary: Assign a specific donor to a blood request
 *     tags: [Admin – Requests]
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
 *             required: [donorId]
 *             properties:
 *               donorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Donor assigned and request updated to DONOR_ASSIGNED
 */
router.put(
  '/requests/:id/assign',
  body('donorId').isMongoId().withMessage('Valid donorId is required'),
  validateRequest,
  adminController.assignDonorToRequest
);

/**
 * @swagger
 * /api/v1/admin/requests/{id}/status:
 *   put:
 *     summary: Change request status respecting the state machine
 *     tags: [Admin – Requests]
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
 *                 enum: [PENDING, APPROVED, DONOR_ASSIGNED, IN_PROGRESS, FULFILLED, REJECTED, CANCELLED]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put(
  '/requests/:id/status',
  body('status').isString().notEmpty().withMessage('status is required'),
  validateRequest,
  adminController.changeRequestStatus
);

// ──────────────────────────────────────────────────────────
// 7. EMERGENCY COORDINATION
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/emergency/live:
 *   get:
 *     summary: Get all active emergency requests
 *     tags: [Admin – Emergency]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of active emergencies with donor response metrics
 */
router.get('/emergency/live', adminController.getLiveEmergencies);
router.get('/emergency', adminController.getLiveEmergencies);
router.get('/live', adminController.getLiveEmergencies);

/**
 * @swagger
 * /api/v1/admin/emergency/{id}/coordinate:
 *   post:
 *     summary: Coordinate or assign donor to an emergency request
 *     tags: [Admin – Emergency]
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ESCALATE, ASSIGN_DONOR]
 *               donorId:
 *                 type: string
 *               distanceKm:
 *                 type: number
 *     responses:
 *       200:
 *         description: Coordination action processed
 */
router.post('/emergency/:id/coordinate', adminController.coordinateEmergency);

// ──────────────────────────────────────────────────────────
// 8. DONATIONS MANAGEMENT
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/donations:
 *   get:
 *     summary: List completed donations with pagination and filters
 *     tags: [Admin – Donations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bloodBankId
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, VERIFIED, REJECTED]
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
 *         description: Paginated donations list
 */
router.get('/donations', adminController.getDonations);

/**
 * @swagger
 * /api/v1/admin/donations/{id}/verify:
 *   put:
 *     summary: Verify completed donation and issue official certificate
 *     tags: [Admin – Donations]
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
 *         description: Donation verified and certificate issued
 */
router.put('/donations/:id/verify', adminController.verifyDonation);

// ──────────────────────────────────────────────────────────
// 9. BROADCAST NOTIFICATIONS
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/notifications/broadcast:
 *   post:
 *     summary: Broadcast announcements to users across selected channels
 *     tags: [Admin – Broadcast]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               target:
 *                 type: string
 *                 enum: [ALL, ROLE, CITY, BLOOD_GROUP]
 *                 default: ALL
 *               role:
 *                 type: string
 *                 enum: [USER, DONOR, HOSPITAL, BLOOD_BANK]
 *               city:
 *                 type: string
 *               bloodGroup:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [IN_APP, EMAIL, SMS]
 *                 default: [IN_APP]
 *     responses:
 *       200:
 *         description: Broadcast delivered to recipients
 */
router.post(
  '/notifications/broadcast',
  body('title').isString().trim().notEmpty().withMessage('title is required'),
  body('message').isString().trim().notEmpty().withMessage('message is required'),
  validateRequest,
  adminController.broadcast
);
router.post('/broadcast', adminController.broadcast);

// ──────────────────────────────────────────────────────────
// 10. COMPLAINTS & GRIEVANCE MANAGEMENT
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/complaints:
 *   get:
 *     summary: List complaints and feedback with pagination and filters
 *     tags: [Admin – Complaints]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [COMPLAINT, FEEDBACK]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_REVIEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
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
 *         description: Paginated complaints and feedback tickets
 */
router.get('/complaints', adminController.getComplaints);

/**
 * @swagger
 * /api/v1/admin/complaints/{id}/assign:
 *   put:
 *     summary: Assign complaint ticket to an admin
 *     tags: [Admin – Complaints]
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
 *               adminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complaint assigned successfully
 */
router.put('/complaints/:id/assign', adminController.assignComplaint);

/**
 * @swagger
 * /api/v1/admin/complaints/{id}/respond:
 *   post:
 *     summary: Add official administrative response to complaint
 *     tags: [Admin – Complaints]
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
 *               status:
 *                 type: string
 *                 enum: [IN_REVIEW, IN_PROGRESS, RESOLVED, CLOSED]
 *               resolutionNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response saved and user notified
 */
router.post(
  '/complaints/:id/respond',
  body('message').isString().trim().notEmpty().withMessage('Response message is required'),
  validateRequest,
  adminController.respondComplaint
);

/**
 * @swagger
 * /api/v1/admin/complaints/{id}/resolve:
 *   put:
 *     summary: Mark complaint ticket as RESOLVED
 *     tags: [Admin – Complaints]
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
 *               resolutionNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complaint resolved and user notified
 */
router.put('/complaints/:id/resolve', adminController.resolveComplaint);

// ──────────────────────────────────────────────────────────
// 11. AUDIT LOGS TRAIL
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: List audit log entries with filters and pagination
 *     tags: [Admin – Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated audit log entries
 */
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/filters', getDistinctActions);
router.get('/audit-logs/:id', getAuditLogById);

// ──────────────────────────────────────────────────────────
// 12. CLINICAL & SYSTEM REPORTS
// ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/reports:
 *   get:
 *     summary: Retrieve clinical aggregation reports
 *     description: >-
 *       Returns MongoDB aggregation pipelines: donations per month, requests by status,
 *       blood group demand vs supply, top donors, city-wise activity, fulfillment rate,
 *       and average response time for emergencies.
 *     tags: [Admin – Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD or ISO)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum:
 *             - donations-per-month
 *             - requests-by-status
 *             - blood-group-demand-supply
 *             - top-donors
 *             - city-wise-activity
 *             - fulfillment-rate
 *             - emergency-response-time
 *             - all
 *         description: Optional report subsection to filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Item count limit for top donors or lists
 *     responses:
 *       200:
 *         description: Aggregated reports dataset
 */
router.get('/reports', adminController.getReports);

/**
 * @swagger
 * /api/v1/admin/reports/{type}/export:
 *   get:
 *     summary: Export report as streamed PDF or Excel file
 *     description: Streams generated PDF (using pdfkit) or Excel workbook (using exceljs) with correct headers.
 *     tags: [Admin – Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - donations-per-month
 *             - requests-by-status
 *             - blood-group-demand-supply
 *             - top-donors
 *             - city-wise-activity
 *             - fulfillment-rate
 *             - emergency-response-time
 *             - all
 *         description: Report type to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, excel, xlsx]
 *           default: pdf
 *         description: File format (pdf or excel)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Start date boundary
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: End date boundary
 *     responses:
 *       200:
 *         description: Streamed file payload (application/pdf or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 */
router.get('/reports/:type/export', adminController.exportReport);
router.get('/reports/export', adminController.exportReport);

export default router;

