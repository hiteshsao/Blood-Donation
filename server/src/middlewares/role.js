/**
 * Role-based access control middleware
 * Accepts one or more allowed roles e.g. authorize('ADMIN', 'BLOOD_BANK')
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

/**
 * Convenience middleware to strictly require ADMIN role
 */
export const isAdmin = authorize('ADMIN');
