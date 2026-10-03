import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert non-ApiError instances
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    let message = error.message || 'Internal Server Error';
    let errors = error.errors || [];

    // Mongoose bad ObjectId (CastError)
    if (error.name === 'CastError') {
      statusCode = 400;
      message = `Resource not found with id: ${error.value}`;
    }

    // Mongoose Duplicate Key Error (Code 11000)
    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      message = `Duplicate value entered for ${field}. Please use another value.`;
    }

    // Mongoose Validation Error
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errors = Object.values(error.errors || {}).map((val) => val.message);
      message = errors.join(', ') || 'Validation error';
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token. Please log in again.';
    }

    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token has expired. Please refresh your session.';
    }

    // Multer file upload errors
    if (error.name === 'MulterError') {
      statusCode = 400;
      message = `Upload error: ${error.message}`;
    }

    error = new ApiError(statusCode, message, errors, error.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors?.length ? error.errors : undefined,
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  return res.status(error.statusCode || 500).json(response);
};
