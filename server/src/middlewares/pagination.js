/**
 * Global Pagination Limiter Middleware
 * Clamps req.query.limit to MAX_LIMIT (100) and ensures req.query.page >= 1.
 * Prevents memory exhaustion / DoS attacks from unbounded page sizes.
 */

export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 20;

export const paginationLimiter = (req, res, next) => {
  if (req.query) {
    if (req.query.limit !== undefined) {
      const parsedLimit = parseInt(req.query.limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        req.query.limit = DEFAULT_PAGE_LIMIT;
      } else {
        req.query.limit = Math.min(parsedLimit, MAX_PAGE_LIMIT);
      }
    }

    if (req.query.page !== undefined) {
      const parsedPage = parseInt(req.query.page, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        req.query.page = 1;
      } else {
        req.query.page = parsedPage;
      }
    }
  }

  next();
};

export default paginationLimiter;
