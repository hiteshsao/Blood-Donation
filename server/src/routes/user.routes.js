import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import {
  getMe,
  updateMe,
  uploadProfilePhoto,
} from '../controllers/user.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Retrieve current authenticated user profile
 *     tags: [Users]
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update profile fields including address, blood group and location
 *     tags: [Users]
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
      .withMessage('Mobile number must be a valid 10-15 digit phone number'),
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    body('gender')
      .optional()
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Gender must be MALE, FEMALE, or OTHER'),
    body('pincode')
      .optional()
      .trim()
      .matches(/^[A-Za-z0-9\s-]{3,10}$/)
      .withMessage('Pincode must be between 3 and 10 characters'),
    body('emergencyContact.phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\+?[0-9]{10,15}$/)
      .withMessage('Emergency contact phone must be 10-15 digits'),
    validateRequest,
  ],
  updateMe
);

/**
 * @swagger
 * /api/users/me/photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Users]
 */
router.post(
  '/me/photo',
  authenticate,
  upload.single('photo'),
  uploadProfilePhoto
);

export default router;
