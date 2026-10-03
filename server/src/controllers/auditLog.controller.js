import { AuditLog } from '../models/AuditLog.js';

/**
 * GET /api/v1/admin/audit-logs
 *
 * Query audit logs with rich filtering, sorting, and cursor/offset pagination.
 *
 * Query parameters:
 *   actor      – ObjectId of the user who performed the action
 *   action     – exact action string (e.g. LOGIN_SUCCESS, USER_BLOCK)
 *   entity     – entity/model name (e.g. User, BloodBank)
 *   entityId   – specific entity document id
 *   startDate  – ISO-8601 date string, inclusive lower bound on createdAt
 *   endDate    – ISO-8601 date string, inclusive upper bound on createdAt
 *   search     – partial text search across action and entity fields
 *   page       – page number (1-based, default 1)
 *   limit      – results per page (default 25, max 100)
 *   sort       – field to sort by (default: createdAt)
 *   order      – asc | desc (default: desc)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      actor,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 25,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    // Build filter
    const filter = {};

    if (actor) {
      filter.actor = actor;
    }

    if (action) {
      filter.action = action;
    }

    if (entity) {
      filter.entity = entity;
    }

    if (entityId) {
      filter.entityId = entityId;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          // Make endDate inclusive of the entire day
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
      // Remove empty object if neither date was valid
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    // Partial text search across action and entity
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { action: regex },
        { entity: regex },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const allowedSortFields = ['createdAt', 'action', 'entity', 'actor'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute queries in parallel for performance
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'name email role')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/audit-logs/actions
 *
 * Returns the distinct action values in the audit log collection.
 * Useful for building filter dropdowns in the admin UI.
 */
export const getDistinctActions = async (req, res, next) => {
  try {
    const actions = await AuditLog.distinct('action');
    const entities = await AuditLog.distinct('entity');

    res.status(200).json({
      success: true,
      data: {
        actions: actions.sort(),
        entities: entities.sort(),
      },
      actions: actions.sort(),
      entities: entities.sort(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/audit-logs/:id
 *
 * Returns a single audit log entry by ID.
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('actor', 'name email role')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log entry not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
