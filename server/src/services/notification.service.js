import { Notification, User } from '../models/index.js';
import { getIO } from '../config/socket.js';
import { sendEmail } from '../config/mailer.js';

// ── 1. SMS PROVIDER INTERFACE & MOCK IMPLEMENTATION ──

/**
 * Abstract Base SMS Provider Interface
 * Allows plug-and-play integration for providers like Twilio, MSG91, AWS SNS, etc.
 */
export class BaseSMSProvider {
  /**
   * Send an SMS message
   * @param {Object} params
   * @param {string} params.to - E.164 phone number
   * @param {string} params.message - SMS text content
   * @param {Object} [params.meta] - Context metadata
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendSMS({ to, message, meta = {} }) {
    throw new Error('sendSMS method must be implemented by SMS provider');
  }
}

/**
 * Mock SMS Provider
 * Logs SMS output to console and stores in memory for testing/verification.
 */
export class MockSMSProvider extends BaseSMSProvider {
  constructor() {
    super();
    this.sentLog = [];
  }

  async sendSMS({ to, message, meta = {} }) {
    const record = {
      to,
      message,
      meta,
      timestamp: new Date(),
      messageId: `mock-sms-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      provider: 'mock-sms',
    };

    this.sentLog.push(record);

    console.log(`\n📱 [SMS Mock Provider] ==============================`);
    console.log(`To:        ${to}`);
    console.log(`Message:   ${message}`);
    console.log(`MessageId: ${record.messageId}`);
    if (Object.keys(meta).length > 0) {
      console.log(`Meta:      ${JSON.stringify(meta)}`);
    }
    console.log(`====================================================\n`);

    return {
      success: true,
      messageId: record.messageId,
      provider: 'mock-sms',
    };
  }

  clearLog() {
    this.sentLog = [];
  }

  getLog() {
    return this.sentLog;
  }
}

// Active provider instance (can be swapped via setSMSProvider)
let activeSMSProvider = new MockSMSProvider();

export const setSMSProvider = (provider) => {
  activeSMSProvider = provider;
};

export const getSMSProvider = () => activeSMSProvider;

// ── 2. HTML EMAIL TEMPLATE GENERATOR ──

/**
 * Generates responsive LifeDrop HTML email layout
 */
export const buildNotificationHtml = ({ title, message, meta = {}, userName = 'User' }) => {
  const metaRows = Object.entries(meta)
    .filter(([k, v]) => v !== undefined && v !== null && typeof v !== 'object')
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding: 6px 12px; font-weight: 700; color: #64748B; font-size: 13px; text-transform: capitalize;">${k.replace(/([A-Z])/g, ' $1')}:</td>
        <td style="padding: 6px 12px; font-weight: 600; color: #0F172A; font-size: 13px;">${v}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF8F8; margin: 0; padding: 24px; color: #0F172A; }
    .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border: 1px solid #FFE4E4; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(198, 40, 40, 0.08); }
    .header { background: linear-gradient(135deg, #991B1B 0%, #C62828 100%); padding: 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #FFEAEA; }
    .body { padding: 28px 24px; }
    .greeting { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
    .title { font-size: 18px; font-weight: 800; color: #0F172A; margin: 0 0 12px; }
    .msg { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px; }
    .meta-table { width: 100%; border-collapse: collapse; background: #FFF5F5; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .btn { display: inline-block; background: #C62828; color: #FFFFFF !important; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 9999px; text-decoration: none; box-shadow: 0 2px 8px rgba(198, 40, 40, 0.25); }
    .footer { border-top: 1px solid #F1F5F9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🩸 LifeDrop Transfusion Network</h1>
      <p>Automated Clinical Notification Dispatch</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${userName},</div>
      <h2 class="title">${title}</h2>
      <div class="msg">${message}</div>

      ${
        metaRows
          ? `
      <table class="meta-table">
        <tbody>${metaRows}</tbody>
      </table>`
          : ''
      }

      <div style="text-align: center; margin-top: 16px;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Open LifeDrop Portal</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">This is an automated dispatch from LifeDrop. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// ── 3. UNIFIED NOTIFY SERVICE ──

/**
 * Universal notification dispatcher usable across all application modules.
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.userId - Recipient user ID
 * @param {string} options.type - Semantic notification type (e.g. 'EMERGENCY_ALERT', 'APPOINTMENT_REMINDER')
 * @param {string} options.title - Short descriptive title
 * @param {string} options.message - Notification message body
 * @param {('IN_APP'|'EMAIL'|'SMS')[]} [options.channels=['IN_APP']] - Targeted channels
 * @param {Object} [options.meta={}] - Structured metadata context
 * @returns {Promise<{ success: boolean, notification?: Object, delivery: { inApp: boolean, email: boolean, sms: boolean } }>}
 */
export const notify = async ({
  userId,
  type,
  title,
  message,
  channels = ['IN_APP'],
  meta = {},
}) => {
  if (!userId) {
    throw new Error('userId is required for notification dispatch.');
  }
  if (!title || !message) {
    throw new Error('title and message are required for notification dispatch.');
  }

  // Normalize channels to uppercase array
  const rawChannels = Array.isArray(channels) ? channels : [channels];
  const activeChannels = rawChannels.map((c) => String(c).toUpperCase());

  const delivery = {
    inApp: false,
    email: false,
    sms: false,
  };

  let notificationDoc = null;
  let recipientUser = null;

  // Fetch recipient user details if email or SMS is requested and not provided in meta
  const needsUserData =
    (!meta.email && activeChannels.includes('EMAIL')) ||
    (!meta.phone && activeChannels.includes('SMS'));

  if (needsUserData) {
    try {
      recipientUser = await User.findById(userId).select('name email phone mobile').lean();
    } catch (e) {
      console.warn(`[NotificationService] User fetch error for ${userId}: ${e.message}`);
    }
  }

  const recipientEmail = meta.email || recipientUser?.email;
  const recipientPhone = meta.phone || meta.mobile || recipientUser?.phone || recipientUser?.mobile;
  const recipientName = meta.name || recipientUser?.name || 'LifeDrop Member';

  // 1. IN_APP Channel: Persist to MongoDB + Socket.io Emission
  if (activeChannels.includes('IN_APP')) {
    try {
      notificationDoc = await Notification.create({
        user: userId,
        recipient: userId,
        type: type || 'SYSTEM_ALERT',
        title,
        message,
        channels: activeChannels,
        channel: 'IN_APP',
        meta,
        data: meta,
        isRead: false,
      });

      // Emit live event via Socket.io
      try {
        const io = getIO();
        if (io) {
          io.to(`user:${userId}`).emit('notification', notificationDoc);
        }
      } catch (sockErr) {
        // Socket offline during scripts/tests is non-fatal
      }

      delivery.inApp = true;
    } catch (dbErr) {
      console.warn(`[NotificationService] IN_APP error: ${dbErr.message}`);
    }
  }

  // 2. EMAIL Channel: Nodemailer with LifeDrop HTML Template
  if (activeChannels.includes('EMAIL') && recipientEmail) {
    try {
      const htmlContent = buildNotificationHtml({
        title,
        message,
        meta,
        userName: recipientName,
      });

      await sendEmail({
        to: recipientEmail,
        subject: `[LifeDrop] ${title}`,
        text: `${title}\n\n${message}`,
        html: htmlContent,
      });

      delivery.email = true;
    } catch (mailErr) {
      console.warn(`[NotificationService] EMAIL error to ${recipientEmail}: ${mailErr.message}`);
    }
  }

  // 3. SMS Channel: Provider Interface (Mock/Twilio/MSG91)
  if (activeChannels.includes('SMS') && recipientPhone) {
    try {
      const smsRes = await activeSMSProvider.sendSMS({
        to: recipientPhone,
        message: `${title}: ${message}`,
        meta,
      });

      if (smsRes.success) {
        delivery.sms = true;
      }
    } catch (smsErr) {
      console.warn(`[NotificationService] SMS error to ${recipientPhone}: ${smsErr.message}`);
    }
  }

  return {
    success: true,
    notification: notificationDoc,
    delivery,
  };
};

// ── 4. NOTIFICATION RETRIEVAL & LIFECYCLE MANAGEMENT ──

/**
 * Get paginated notifications for a user with unread filtering
 */
export const getNotifications = async (userId, {
  unread = false,
  page = 1,
  limit = 20,
} = {}) => {
  const query = { user: userId };

  // Support unread filter: unread=true or isRead=false
  if (unread === true || unread === 'true') {
    query.isRead = false;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      unreadCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get count of unread notifications for a user
 */
export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({ user: userId, isRead: false });
  return { count };
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });

  if (!notification) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return {
    success: true,
    modifiedCount: result.modifiedCount || 0,
  };
};

/**
 * Delete a specific notification belonging to the user
 */
export const deleteNotification = async (notificationId, userId) => {
  const deleted = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId,
  });

  if (!deleted) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    message: 'Notification deleted successfully.',
    id: notificationId,
  };
};
