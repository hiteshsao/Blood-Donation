/**
 * Async wrapper to catch promises and forward errors to Express next()
 * @param {Function} requestHandler
 * @returns {Function}
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
