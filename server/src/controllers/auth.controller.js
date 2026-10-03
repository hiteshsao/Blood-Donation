import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, DonorProfile, Hospital, BloodBank } from '../models/index.js';
import { sendOtpToUser, verifyOtp } from '../services/otp.service.js';
import { auditLog } from '../services/auditLog.service.js';

// Cookie configuration for refresh token
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

// Helper to issue access (15m) & refresh (7d) tokens
export const generateTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'blood_donation_super_secure_access_token_secret_key_2026_xyz!',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'blood_donation_super_secure_refresh_token_secret_key_2026_xyz!',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user, hospital, or blood bank
 * POST /api/v1/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      mobile,
      password,
      role = 'USER',
      bloodGroup,
      address,
      city,
      state,
      pincode,
      licenseNumber,
      registrationNumber,
      licenseDocUrl,
      facilityName,
    } = req.body;

    const userPhone = phone || mobile;
    const userRole = ['USER', 'DONOR', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN'].includes(role) ? role : 'USER';
    const isFacility = userRole === 'HOSPITAL' || userRole === 'BLOOD_BANK';

    const existingUser = await User.findOne({ email: email.toLowerCase() }).select('+verificationOtp +isVerified +status');

    if (existingUser) {
      if (existingUser.isVerified || existingUser.isEmailVerified) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in.',
        });
      } else {
        // User exists but unverified, update details & resend OTP
        existingUser.name = name || existingUser.name;
        if (userPhone) {
          existingUser.phone = userPhone;
          existingUser.mobile = userPhone;
        }
        if (password) existingUser.password = password;
        existingUser.role = userRole;
        existingUser.status = 'PENDING';
        if (bloodGroup) existingUser.bloodGroup = bloodGroup;
        await existingUser.save();

        await sendOtpToUser(existingUser, 'REGISTRATION');

        return res.status(200).json({
          success: true,
          message: 'Verification code resent. Please verify your email to activate your account.',
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status,
          requiresVerification: true,
        });
      }
    }

    // New user status: HOSPITAL/BLOOD_BANK stay PENDING until admin verifies
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone: userPhone,
      mobile: userPhone,
      password,
      role: userRole,
      status: 'PENDING', // starts PENDING
      isEmailVerified: false,
      isVerified: false,
      bloodGroup: bloodGroup || null,
      address: address || { city: city || '', state: state || '', pincode: pincode || '' },
      city: city || (address && address.city) || '',
      state: state || (address && address.state) || '',
      pincode: pincode || (address && address.pincode) || '',
    });

    await newUser.save();

    // Facility records initialization
    if (userRole === 'HOSPITAL') {
      await Hospital.create({
        user: newUser._id,
        name: facilityName || name,
        licenseNumber: licenseNumber || `HOSP-${Date.now()}`,
        licenseDocUrl: licenseDocUrl || null,
        address: address || { city: city || '', state: state || '', pincode: pincode || '' },
        contact: {
          phone: userPhone,
          email: newUser.email,
        },
        verificationStatus: 'PENDING',
        isVerified: false,
      });
    } else if (userRole === 'BLOOD_BANK') {
      await BloodBank.create({
        user: newUser._id,
        name: facilityName || name,
        licenseNumber: licenseNumber || registrationNumber || `BB-${Date.now()}`,
        registrationNumber: registrationNumber || licenseNumber || `BB-${Date.now()}`,
        licenseDocUrl: licenseDocUrl || null,
        address: address || { city: city || '', state: state || '', pincode: pincode || '' },
        contact: {
          phone: userPhone,
          email: newUser.email,
        },
        verificationStatus: 'PENDING',
        status: 'PENDING',
        isVerified: false,
      });
    } else if (userRole === 'DONOR') {
      await DonorProfile.create({
        user: newUser._id,
        bloodGroup: bloodGroup || 'O+',
        isAvailable: true,
        verificationStatus: 'PENDING',
      });
    }

    // Send 6-digit OTP (10 min expiry)
    await sendOtpToUser(newUser, 'REGISTRATION');

    res.status(201).json({
      success: true,
      message: isFacility
        ? 'Registration successful! An OTP has been sent to your email. Note: Organization accounts remain pending until admin verification.'
        : 'Registration successful! An OTP has been sent to your email address.',
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('\n🔴 [Register Controller Error Details]:');
    console.error('Message:', error.message);
    console.error('Stack Trace:\n', error.stack);
    console.error('--------------------------------------------------\n');
    next(error);
  }
};

/**
 * Verify OTP (email OTP, 6 digit, 10 min expiry, hashed in DB)
 * POST /api/v1/auth/verify-otp
 */
export const verifyUserOtp = async (req, res, next) => {
  try {
    const { email, otp, type = 'REGISTRATION' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and OTP.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+verificationOtp +passwordResetOtp +refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    // Verify OTP
    verifyOtp(user, otp, type);

    if (type === 'REGISTRATION') {
      user.isEmailVerified = true;
      user.isVerified = true;
      user.emailVerified = true;
      user.verificationOtp = undefined;

      // Hospital and Blood Bank remain PENDING until admin verifies
      const isFacility = user.role === 'HOSPITAL' || user.role === 'BLOOD_BANK';
      if (isFacility) {
        user.status = 'PENDING';
      } else {
        user.status = 'ACTIVE';
      }

      const { accessToken, refreshToken } = generateTokens(user);
      user.refreshToken = refreshToken;
      await user.save();

      // Set httpOnly cookie with refresh token
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

      const userObject = user.toObject();
      delete userObject.password;
      delete userObject.passwordHash;
      delete userObject.refreshToken;

      return res.status(200).json({
        success: true,
        message: isFacility
          ? 'Email verified successfully! Your facility account is pending administrator verification before activation.'
          : 'Account successfully verified and activated!',
        accessToken,
        refreshToken,
        user: userObject,
        isPendingApproval: isFacility,
      });
    }

    // For password reset, just confirm OTP is valid
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now reset your password.',
      email: user.email,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Resend OTP
 * POST /api/v1/auth/resend-otp
 */
export const resendOtp = async (req, res, next) => {
  try {
    const { email, type = 'REGISTRATION' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+verificationOtp +passwordResetOtp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    if (type === 'REGISTRATION' && (user.isEmailVerified || user.isVerified)) {
      return res.status(400).json({
        success: false,
        message: 'This account has already been verified. Please log in.',
      });
    }

    await sendOtpToUser(user, type);

    res.status(200).json({
      success: true,
      message: `A new OTP has been dispatched to ${user.email}.`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * User / Donor / Facility Login
 * POST /api/v1/auth/login
 * Blocks unverified/blocked users, returns access token 15m + refresh token 7d in httpOnly cookie
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +passwordHash +refreshToken');

    if (!user) {
      // Audit: failed login — unknown email
      auditLog({ action: 'LOGIN_FAILED', entity: 'User', req, meta: { email: email.toLowerCase(), reason: 'unknown_email' } });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Audit: failed login — wrong password
      auditLog({ action: 'LOGIN_FAILED', entity: 'User', entityId: user._id, req, meta: { email: user.email, reason: 'wrong_password' } });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    // Block unverified users
    const isVerified = user.isEmailVerified || user.emailVerified || user.isVerified;
    if (!isVerified) {
      try {
        await sendOtpToUser(user, 'REGISTRATION');
      } catch (e) {
        // cooldown may be active
      }
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please verify your email with the OTP sent to your inbox.',
        requiresVerification: true,
        email: user.email,
      });
    }

    // Block blocked / inactive users
    if (user.status === 'BLOCKED' || user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended or blocked. Please contact system administrator.',
      });
    }

    // Block pending facility accounts until verified by admin
    if ((user.role === 'HOSPITAL' || user.role === 'BLOOD_BANK') && user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        message: 'Your organization account is pending administrator verification. Please check back later.',
        isPendingApproval: true,
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token in httpOnly cookie (7 days)
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.passwordHash;
    delete userObject.refreshToken;

    // Audit: successful login
    auditLog({ action: 'LOGIN_SUCCESS', entity: 'User', entityId: user._id, actor: user._id, req, meta: { email: user.email, role: user.role } });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: userObject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stricter Admin Login Route
 * POST /auth/admin/login or POST /api/v1/auth/admin/login
 * Strictly verifies ADMIN role, blocks non-admins with 403 Forbidden
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both admin email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +passwordHash +refreshToken');

    if (!user) {
      // Audit: failed admin login — unknown email
      auditLog({ action: 'ADMIN_LOGIN_FAILED', entity: 'User', req, meta: { email: email.toLowerCase(), reason: 'unknown_email' } });
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.',
      });
    }

    // Stricter role check: strictly ADMIN
    if (user.role !== 'ADMIN') {
      // Audit: failed admin login — non-admin role
      auditLog({ action: 'ADMIN_LOGIN_FAILED', entity: 'User', entityId: user._id, req, meta: { email: user.email, role: user.role, reason: 'not_admin' } });
      return res.status(403).json({
        success: false,
        message: 'Access denied: Strictly reserved for system administrators.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Audit: failed admin login — wrong password
      auditLog({ action: 'ADMIN_LOGIN_FAILED', entity: 'User', entityId: user._id, req, meta: { email: user.email, reason: 'wrong_password' } });
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials.',
      });
    }

    if (user.status === 'BLOCKED' || user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Administrative account is blocked or suspended.',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token in httpOnly cookie (7 days)
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.passwordHash;
    delete userObject.refreshToken;

    // Audit: successful admin login
    auditLog({ action: 'ADMIN_LOGIN_SUCCESS', entity: 'User', entityId: user._id, actor: user._id, req, meta: { email: user.email } });

    res.status(200).json({
      success: true,
      message: 'Admin authentication successful.',
      accessToken,
      refreshToken,
      user: userObject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || 'blood_donation_super_secure_refresh_token_secret_key_2026_xyz!'
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is no longer valid or has been revoked.',
      });
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Rotate refresh token in cookie
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout
 * POST /api/v1/auth/logout
 * Clears httpOnly cookie and invalidates user refresh token
 */
export const logout = async (req, res, next) => {
  try {
    // Invalidate refresh token in database if user is authenticated
    if (req.user) {
      req.user.refreshToken = null;
      await req.user.save();
    } else {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (token) {
        await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
      }
    }

    // Clear httpOnly cookie
    res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Successfully logged out.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Do not disclose whether email exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
      });
    }

    await sendOtpToUser(user, 'PASSWORD_RESET');

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
      email: user.email,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Reset Password
 * POST /api/v1/auth/reset-password
 * Bcrypt cost 12
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetOtp +password +passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    verifyOtp(user, otp, 'PASSWORD_RESET');

    // Hash with bcrypt cost 12
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordHash = hashedPassword;
    user.passwordResetOtp = undefined;
    user.refreshToken = null; // Revoke active sessions
    await user.save();

    // Audit: password reset
    auditLog({ action: 'PASSWORD_RESET', entity: 'User', entityId: user._id, req, meta: { email: user.email } });

    res.status(200).json({
      success: true,
      message: 'Password successfully reset! Please log in with your new password.',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Change Password (Protected)
 * POST /api/v1/auth/change-password
 * Requires authenticated user, validates current password, hashes new password with bcrypt cost 12
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findById(req.user._id).select('+password +passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.',
      });
    }

    // Hash with bcrypt cost 12
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordHash = hashedPassword;
    await user.save();

    // Audit: password change
    auditLog({ action: 'PASSWORD_CHANGE', entity: 'User', entityId: user._id, actor: user._id, req });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    let donorProfile = null;
    let facility = null;

    if (req.user.role === 'DONOR') {
      donorProfile = await DonorProfile.findOne({ user: req.user._id });
    } else if (req.user.role === 'HOSPITAL') {
      facility = await Hospital.findOne({ user: req.user._id });
    } else if (req.user.role === 'BLOOD_BANK') {
      facility = await BloodBank.findOne({ user: req.user._id });
    }

    res.status(200).json({
      success: true,
      user: req.user,
      donorProfile,
      facility,
    });
  } catch (error) {
    next(error);
  }
};
