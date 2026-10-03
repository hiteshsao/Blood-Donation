import * as notificationService from '../services/notification.service.js';

/**
 * GET /api/v1/notifications
 * Query params: unread (boolean), page (number), limit (number)
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { unread, page, limit } = req.query;
    const result = await notificationService.getNotifications(req.user._id, {
      unread,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread-count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user._id);
    res.status(200).json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/notifications/:id/read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/notifications/read-all
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/notifications/:id
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await notificationService.deleteNotification(id, req.user._id);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/notifications/send (Admin utility)
 */
export const sendNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message, channels, meta } = req.body;
    const result = await notificationService.notify({
      userId: userId || req.user._id,
      type,
      title,
      message,
      channels,
      meta,
    });

    res.status(201).json({
      success: true,
      message: 'Notification successfully dispatched.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
