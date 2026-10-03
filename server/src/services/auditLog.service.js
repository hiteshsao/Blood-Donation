import { AuditLog } from '../models/AuditLog.js';

/**
 * Extract the real client IP, respecting common proxy headers.
 * Falls back to socket address.
 */
const extractIp = (req) => {
  if (!req) return '';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  }
  return req.ip || req.connection?.remoteAddress || '';
};

/**
 * Extract user-agent string from request.
 */
const extractUserAgent = (req) => {
  if (!req) return '';
  return req.headers?.['user-agent'] || '';
};

/**
 * Non-blocking audit log writer.
 *
 * Usage:
 *   auditLog({
 *     action: 'LOGIN_SUCCESS',
 *     entity: 'User',
 *     entityId: user._id,
 *     actor: user._id,         // ObjectId or null for unauthenticated events
 *     before: null,            // snapshot before mutation
 *     after: { email: '…' },   // snapshot after mutation
 *     req,                     // Express request object (for IP / UA)
 *     meta: { reason: '…' },   // optional freeform metadata
 *   });
 *
 * This function is intentionally fire-and-forget:
 *   – Returns a Promise so callers *can* await if needed (e.g. tests).
 *   – All errors are caught and logged to stderr; they never throw or reject.
 *   – The caller's request pipeline is never blocked or broken.
 *
 * @param {Object} opts
 * @returns {Promise<void>}
 */
export const auditLog = async ({
  action,
  entity,
  entityId = null,
  actor = null,
  before = null,
  after = null,
  req = null,
  meta = null,
}) => {
  // Intentional fire-and-forget — wrapped in try/catch so failures are silent
  try {
    const doc = {
      action,
      entity,
      entityId: entityId || null,
      actor: actor || (req?.user?._id ?? null),
      before: before ?? null,
      after: after ?? null,
      ip: extractIp(req),
      userAgent: extractUserAgent(req),
    };

    // Store extra metadata if provided
    if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
      doc.meta = meta;
    }

    // Non-blocking create — we don't await in the caller's hot path
    // because this function itself is not awaited by the middleware/controller.
    await AuditLog.create(doc);
  } catch (err) {
    // Log to stderr but NEVER throw — audit failures must not break the app
    console.error('[AuditLog] Failed to persist audit entry:', err.message);
  }
};

/**
 * Convenience helper: build a safe, redacted "before" / "after" snapshot from
 * a Mongoose document, stripping sensitive fields.
 *
 * @param {import('mongoose').Document|Object|null} doc
 * @param {string[]} redactFields - field names to strip (default: password-related)
 * @returns {Object|null}
 */
export const safeSnapshot = (doc, redactFields = [
  'password',
  'passwordHash',
  'refreshToken',
  'verificationOtp',
  'passwordResetOtp',
  '__v',
]) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  for (const field of redactFields) {
    delete plain[field];
  }
  return plain;
};
