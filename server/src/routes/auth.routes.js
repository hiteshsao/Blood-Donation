import express from 'express';
import { body } from 'express-validator';
import {
  register,
  verifyUserOtp,
  resendOtp,
  login,
  adminLogin,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  logout,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimit.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User, Hospital, Blood Bank & Administrator authentication and credential management APIs
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user, hospital, or blood bank
 *     description: Self-serve account creation. Hospital and Blood Bank accounts start with status PENDING until admin verification. Sends 6-digit OTP to user email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. Sarah Jenkins
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sarah@cityhospital.org
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: SecurePass@2026
 *               role:
 *                 type: string
 *                 enum: [USER, DONOR, HOSPITAL, BLOOD_BANK]
 *                 default: USER
 *                 example: HOSPITAL
 *               facilityName:
 *                 type: string
 *                 example: Apollo City Hospital
 *               licenseNumber:
 *                 type: string
 *                 example: HOSP-MH-2026-908
 *               bloodGroup:
 *                 type: string
 *                 enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *                 example: O+
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               state:
 *                 type: string
 *                 example: Maharashtra
 *               pincode:
 *                 type: string
 *                 example: "400001"
 *     responses:
 *       201:
 *         description: Account created successfully. Verification OTP dispatched.
 *       400:
 *         description: Validation error.
 *       409:
 *         description: Email already in use.
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Phone number must not be empty if provided'),
    body('mobile')
      .optional()
      .trim()
      .notEmpty(),
    body('role')
      .optional()
      .isIn(['USER', 'DONOR', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN'])
      .withMessage('Invalid role provided'),
    body('bloodGroup')
      .optional()
      .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
      .withMessage('Invalid blood group'),
    validateRequest,
  ],
  register
);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify 6-digit email OTP
 *     description: Verifies OTP for account activation or password reset. Activates USER accounts, leaves HOSPITAL/BLOOD_BANK as PENDING until admin verification. Returns 15m access token and 7d refresh token in httpOnly cookie.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *               type:
 *                 type: string
 *                 enum: [REGISTRATION, PASSWORD_RESET]
 *                 default: REGISTRATION
 *     responses:
 *       200:
 *         description: OTP verified successfully.
 *       400:
 *         description: Invalid or expired OTP.
 *       404:
 *         description: User account not found.
 */
router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),
    body('type').optional().isIn(['REGISTRATION', 'PASSWORD_RESET']),
    validateRequest,
  ],
  verifyUserOtp
);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Resend verification or password reset OTP
 *     description: Rate-limited dispatch of new 6-digit OTP with 10-minute expiry to user email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               type:
 *                 type: string
 *                 enum: [REGISTRATION, PASSWORD_RESET]
 *                 default: REGISTRATION
 *     responses:
 *       200:
 *         description: OTP re-sent successfully.
 *       400:
 *         description: Account already verified or cooldown active.
 *       404:
 *         description: User account not found.
 */
router.post(
  '/resend-otp',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('type').optional().isIn(['REGISTRATION', 'PASSWORD_RESET']),
    validateRequest,
  ],
  resendOtp
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User, Donor, Hospital, or Blood Bank login
 *     description: Authenticates user credentials. Blocks unverified, blocked, and pending facility accounts. Sets 7-day refresh token in httpOnly cookie and returns 15-minute access token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: donor@example.com
 *               password:
 *                 type: string
 *                 example: SecurePassword@123
 *     responses:
 *       200:
 *         description: Login successful. Access token returned and refresh token set in httpOnly cookie.
 *       401:
 *         description: Invalid email or password credentials.
 *       403:
 *         description: Account unverified, blocked, or pending admin verification.
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
  ],
  login
);

/**
 * @swagger
 * /auth/admin/login:
 *   post:
 *     summary: Dedicated strictly-enforced administrator login
 *     description: Stricter route requiring ADMIN role. Rejects non-admin users with 403 Forbidden. Sets 7d refresh token in httpOnly cookie and returns 15m access token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@blooddonation.org
 *               password:
 *                 type: string
 *                 example: AdminSecret@2026
 *     responses:
 *       200:
 *         description: Admin authentication successful.
 *       401:
 *         description: Invalid administrative credentials.
 *       403:
 *         description: Forbidden. User does not possess ADMIN role or is blocked.
 */
router.post(
  '/admin/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid admin email is required'),
    body('password').notEmpty().withMessage('Admin password is required'),
    validateRequest,
  ],
  adminLogin
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Rotate and refresh access token
 *     description: Issues new 15-minute access token and rotates refresh token using token from httpOnly cookie or request body.
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6...
 *     responses:
 *       200:
 *         description: Access token refreshed.
 *       401:
 *         description: Invalid or expired refresh token.
 */
router.post(
  '/refresh-token',
  [
    body('refreshToken').optional().isString(),
    validateRequest,
  ],
  refreshToken
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Revoke session and log out
 *     description: Invalidates active refresh token in database and clears the httpOnly refresh token cookie.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out.
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     description: Generates a 6-digit OTP (10 min expiry) and sends it to the user's email address.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset OTP dispatched if account exists.
 */
router.post(
  '/forgot-password',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    validateRequest,
  ],
  forgotPassword
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     description: Verifies 6-digit OTP and updates user password using bcrypt cost 12. Revokes active refresh tokens.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "654321"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: NewStrongPassword@2026
 *     responses:
 *       200:
 *         description: Password successfully reset.
 *       400:
 *         description: Invalid OTP or password requirement not met.
 *       404:
 *         description: Account not found.
 */
router.post(
  '/reset-password',
  otpLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    validateRequest,
  ],
  resetPassword
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user (Protected)
 *     description: Validates current password, hashes new password with bcrypt cost 12, and updates user profile.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: CurrentPassword@123
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: BrandNewPassword@2026
 *     responses:
 *       200:
 *         description: Password updated successfully.
 *       400:
 *         description: Current password incorrect or new password too short.
 *       401:
 *         description: Unauthorized. Invalid or missing access token.
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    validateRequest,
  ],
  changePassword
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get profile of authenticated user
 *     description: Returns current user details and linked donor, hospital, or blood bank entity.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved.
 *       401:
 *         description: Unauthorized.
 */
router.get('/me', authenticate, getMe);

export default router;
