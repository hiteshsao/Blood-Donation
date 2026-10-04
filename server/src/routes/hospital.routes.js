import express from 'express';
import { param, body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { requireVerifiedHospital } from '../middlewares/facilityAuth.middleware.js';
import { upload } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  getProfile,
  updateProfile,
  uploadLicense,
  getRequests,
  confirmReceived,
} from '../controllers/hospital.controller.js';

const router = express.Router();

// All hospital routes require valid authentication and VERIFIED hospital status
router.use(authenticate, requireVerifiedHospital);

/**
 * @swagger
 * tags:
 *   name: Hospital
 *   description: Verified Hospital Portal endpoints (/api/v1/hospital)
 */

/**
 * @swagger
 * /api/v1/hospital/profile:
 *   get:
 *     summary: Retrieve verified hospital profile
 *     tags: [Hospital]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital profile retrieved
 *       403:
 *         description: Forbidden - Hospital pending verification
 *   put:
 *     summary: Update hospital profile details
 *     tags: [Hospital]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital profile updated
 */
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

/**
 * @swagger
 * /api/v1/hospital/license:
 *   post:
 *     summary: Upload hospital registration/license document
 *     tags: [Hospital]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               license:
 *                 type: string
 *                 format: binary
 *               licenseNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: License uploaded successfully
 */
router.post('/license', upload.single('license'), uploadLicense);
router.put('/license', upload.single('license'), uploadLicense);

/**
 * @swagger
 * /api/v1/hospital/requests:
 *   get:
 *     summary: Retrieve own blood requests created by or assigned to this hospital
 *     tags: [Hospital]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of blood requests with pagination
 */
router.get('/requests', getRequests);

/**
 * @swagger
 * /api/v1/hospital/requests/{id}/confirm-received:
 *   post:
 *     summary: Hospital confirms receipt of blood units (marks FULFILLED)
 *     tags: [Hospital]
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
 *         description: Blood request marked as FULFILLED
 */
router.post(
  '/requests/:id/confirm-received',
  [param('id').isMongoId().withMessage('Valid request ID is required'), validateRequest],
  confirmReceived
);

router.put(
  '/requests/:id/confirm-received',
  [param('id').isMongoId().withMessage('Valid request ID is required'), validateRequest],
  confirmReceived
);

router.post(
  '/confirm-received',
  [body('requestId').isMongoId().withMessage('Valid request ID is required'), validateRequest],
  confirmReceived
);

router.put(
  '/confirm-received',
  [body('requestId').isMongoId().withMessage('Valid request ID is required'), validateRequest],
  confirmReceived
);

export default router;
