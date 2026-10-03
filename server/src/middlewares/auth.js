import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Middleware to authenticate requests via JWT Bearer token
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
      token = req.cookies.accessToken || req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'blood_donation_super_secure_access_token_secret_key_2026_xyz!');

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    if (user.isBlocked || user.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact system support.',
      });
    }

    if (user.status === 'INACTIVE' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        expired: true,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed authentication token',
    });
  }
};

/**
 * Role-based authorization middleware
 * Accepts one or more allowed roles e.g. authorize('ADMIN', 'HOSPITAL')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

export const isAdmin = authorize('ADMIN');

/**
 * Optional authentication: populates req.user if a valid token is present,
 * but never blocks unauthenticated requests.
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && (req.cookies.accessToken || req.cookies.token)) {
      token = req.cookies.accessToken || req.cookies.token;
    }

    if (!token) return next();

    const secret =
      process.env.JWT_ACCESS_SECRET ||
      'blood_donation_super_secure_access_token_secret_key_2026_xyz!';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);

    if (user && !user.isBlocked && user.status !== 'BLOCKED' && user.status !== 'INACTIVE') {
      req.user = user;
    }
    next();
  } catch (err) {
    // Silently continue without authenticated user
    next();
  }
};
