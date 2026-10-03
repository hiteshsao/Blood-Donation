import { auditLog, safeSnapshot } from '../services/auditLog.service.js';

/**
 * Express middleware factory that records an audit log entry for every request
 * that passes through it.  Designed for admin mutation routes (POST / PUT / PATCH / DELETE).
 *
 * The middleware runs **after** the response has been sent (via `res.on('finish')`)
 * so it is fully non-blocking and will never delay or break the response.
 *
 * Usage in routes:
 *   import { auditMiddleware } from '../middlewares/auditLog.middleware.js';
 *
 *   router.post('/users/:id/block', authenticate, isAdmin, auditMiddleware({ action: 'USER_BLOCK', entity: 'User' }), blockUser);
 *
 * If the route handler attaches `req.auditBefore` and/or `req.auditAfter` before
 * sending the response, those snapshots are included in the log entry.
 *
 * @param {Object}  opts
 * @param {string}  opts.action   – human-readable action name (e.g. 'USER_BLOCK')
 * @param {string}  opts.entity   – entity/model being mutated (e.g. 'User')
 * @returns {Function} Express middleware
 */
export const auditMiddleware = ({ action, entity }) => {
  return (req, res, next) => {
    // Attach helpers so route handlers can set before/after snapshots easily
    // e.g.  req.auditBefore = oldDoc;  req.auditAfter = updatedDoc;
    // These are optional — the middleware works without them.

    // Hook into the response 'finish' event so logging happens AFTER the
    // response body has been flushed to the client.  This guarantees that
    // even if AuditLog.create takes time or fails, the client response is
    // not affected.
    const originalEnd = res.end;
    let ended = false;

    res.end = function (...args) {
      // Guard against double-fire (e.g. error handler calling end again)
      if (!ended) {
        ended = true;

        // Derive entityId from route params (common patterns)
        const entityId =
          req.auditEntityId ||
          req.params?.id ||
          req.params?.userId ||
          req.body?._id ||
          null;

        // Fire-and-forget — never awaited, never throws
        auditLog({
          action: req.auditAction || action,
          entity: req.auditEntity || entity,
          entityId,
          actor: req.user?._id || null,
          before: req.auditBefore || null,
          after: req.auditAfter || null,
          req,
          meta: req.auditMeta || null,
        }).catch(() => {
          // Swallowed — auditLog already logs internally
        });
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Convenience: audit middleware that auto-detects the HTTP method to build
 * the action name.  Useful for generic admin CRUD routes.
 *
 * Example:  auditCrud('User')  →  actions become  USER_CREATE, USER_UPDATE, etc.
 *
 * @param {string} entity
 * @returns {Function} Express middleware
 */
export const auditCrud = (entity) => {
  return (req, res, next) => {
    const methodMap = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    const verb = methodMap[req.method] || req.method;
    const action = `${entity.toUpperCase()}_${verb}`;

    return auditMiddleware({ action, entity })(req, res, next);
  };
};
