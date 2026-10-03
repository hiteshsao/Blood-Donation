/**
 * NoSQL Injection Sanitizer Middleware
 * Recursively strips keys starting with '$' or containing '.' from req.body, req.params, and req.query.
 * Protects against MongoDB operator injection attacks (e.g. { "$gt": "" }).
 */

const cleanObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    // If the key starts with '$' or contains '.', skip it to sanitize
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }

    if (value && typeof value === 'object') {
      cleaned[key] = cleanObject(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

export const sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = cleanObject(req.body);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = cleanObject(req.params);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = cleanObject(req.query);
    }
    next();
  } catch (err) {
    next(err);
  }
};

export default sanitizeInput;
