import { ApiError } from '../utils/ApiError.js';

/**
 * 404 Route Not Found Middleware
 */
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
