import express from 'express';
import { body, query } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import {
  getMe,
  updateMe,
  updateAddress,
  uploadPhoto,
  becomeDonor,
  donorToggle,
} from '../controllers/profile.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Authenticated user profile management, address/location, photo upload, and donor enrolment
 */

/**
 * @swagger
 * /api/v1/profile/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     description: Returns the full user profile along with any linked donor profile.
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/v1/profile/me:
 *   put:
 *     summary: Update profile fields
 *     description: Update personal information including name, mobile, DOB, gender, blood group, and emergency contact.
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Hitesh Sharma
 *               mobile:
 *                 type: string
 *                 example: "9876543210"
 *               dob:
 *                 type: string
 *                 format: date
 *                 example: "1995-06-15"
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 example: MALE
 *               bloodGroup:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: O+
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Priya Sharma
 *                   relation:
 *                     type: string
 *                     example: Spouse
 *                   phone:
 *                     type: string
 *                     example: "9876543211"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/me',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('mobile')
      .optional()
      .trim()
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage('Mobile number must be 10–15 digits'),
    body('dob')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Date of birth must be a valid ISO-8601 date'),
    body('gender')
      .optional()
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    body('emergencyContact.name').optional().trim(),
    body('emergencyContact.relation').optional().trim(),
    body('emergencyContact.phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage('Emergency contact phone must be 10–15 digits'),
    validateRequest,
  ],
  updateMe
);

/**
 * @swagger
 * /api/v1/profile/address:
 *   put:
 *     summary: Update address and geolocation
 *     description: >
 *       Updates the user's address fields and geolocation stored as a GeoJSON Point.
 *       Accepts location in multiple formats: `{lng, lat}`, `{longitude, latitude}`,
 *       `{type: "Point", coordinates: [lng, lat]}`, or `[lng, lat]`.
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               address:
 *                 type: object
 *                 properties:
 *                   line:
 *                     type: string
 *                     example: 42 MG Road, Near Metro Station
 *                   city:
 *                     type: string
 *                     example: Mumbai
 *                   state:
 *                     type: string
 *                     example: Maharashtra
 *                   pincode:
 *                     type: string
 *                     example: "400001"
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               state:
 *                 type: string
 *                 example: Maharashtra
 *               pincode:
 *                 type: string
 *                 example: "400001"
 *               location:
 *                 type: object
 *                 description: GeoJSON Point or {lat, lng} object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: 19.076
 *                   lng:
 *                     type: number
 *                     example: 72.8777
 *     responses:
 *       200:
 *         description: Address and location updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put(
  '/address',
  authenticate,
  [
    body('address').optional(),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('pincode')
      .optional()
      .trim()
      .matches(/^[A-Za-z0-9\s\-]{3,10}$/)
      .withMessage('Pincode must be 3–10 alphanumeric characters'),
    body('location').optional(),
    validateRequest,
  ],
  updateAddress
);

/**
 * @swagger
 * /api/v1/profile/photo:
 *   post:
 *     summary: Upload profile photo
 *     description: Upload a JPEG, PNG, or WebP image (max 5 MB) as the user's profile photo.
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile photo uploaded
 *       400:
 *         description: No file provided or invalid file type
 *       401:
 *         description: Unauthorized
 */
router.post('/photo', authenticate, upload.single('photo'), uploadPhoto);

/**
 * @swagger
 * /api/v1/profile/become-donor:
 *   post:
 *     summary: Register as a voluntary blood donor
 *     description: >
 *       Creates or reactivates a DonorProfile. Upgrades user role from USER to DONOR.
 *       Requires a blood group either in the request body or already set on the user profile.
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bloodGroup:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: O+
 *               weightKg:
 *                 type: number
 *                 example: 72
 *               medicalNotes:
 *                 type: string
 *                 example: No known allergies
 *     responses:
 *       201:
 *         description: Successfully enrolled as donor
 *       400:
 *         description: Validation error or missing blood group
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/become-donor',
  authenticate,
  [
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    body('weightKg')
      .optional()
      .isFloat({ min: 30, max: 250 })
      .withMessage('Weight must be between 30 and 250 kg'),
    body('medicalNotes').optional().trim(),
    validateRequest,
  ],
  becomeDonor
);

/**
 * @swagger
 * /api/v1/profile/donor-toggle:
 *   put:
 *     summary: Toggle donor availability on / off
 *     description: Flips the donor's `isAvailable` boolean. Requires an existing donor profile.
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Donor availability toggled
 *       404:
 *         description: No donor profile found
 *       401:
 *         description: Unauthorized
 */
router.put('/donor-toggle', authenticate, donorToggle);

export default router;
