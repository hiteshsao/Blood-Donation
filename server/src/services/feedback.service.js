import { Feedback, User } from '../models/index.js';
import { notify } from './notification.service.js';

/**
 * Submit new feedback or complaint.
 *
 * @param {Object} input
 * @returns {Promise<Object>}
 */
export const createFeedback = async ({
  userId,
  type = 'FEEDBACK',
  category = 'GENERAL',
  subject,
  title,
  message,
  description,
  rating = 5,
}) => {
  const finalSubject = (subject || title || '').trim();
  const finalMessage = (message || description || '').trim();

  if (!finalSubject) {
    const err = new Error('Subject / title is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!finalMessage) {
    const err = new Error('Message / description is required.');
    err.statusCode = 400;
    throw err;
  }

  const normalizedType = String(type).toUpperCase() === 'COMPLAINT' ? 'COMPLAINT' : 'FEEDBACK';

  const feedback = await Feedback.create({
    user: userId,
    type: normalizedType,
    category: category || 'GENERAL',
    subject: finalSubject,
    message: finalMessage,
    rating: typeof rating === 'number' ? Math.max(1, Math.min(5, rating)) : 5,
    status: 'OPEN',
    responses: [],
  });

  // Acknowledge submission to the user
  try {
    await notify({
      userId,
      type: normalizedType === 'COMPLAINT' ? 'COMPLAINT_REGISTERED' : 'FEEDBACK_SUBMITTED',
      title: normalizedType === 'COMPLAINT' ? 'Complaint Registered Successfully' : 'Feedback Received',
      message: `Your ${normalizedType.toLowerCase()} ("${finalSubject}") has been recorded. Our team will review your submission promptly.`,
      channels: ['IN_APP'],
      meta: {
        feedbackId: feedback._id,
        type: normalizedType,
        subject: finalSubject,
      },
    });
  } catch (notifErr) {
    console.warn('[FeedbackService] Acknowledgment notification error:', notifErr.message);
  }

  return feedback;
};

/**
 * Retrieve paginated submissions for the authenticated user.
 *
 * @param {string} userId
 * @param {Object} queryParams
 * @returns {Promise<Object>}
 */
export const getMyFeedbacks = async (userId, queryParams = {}) => {
  const { type, status, page = 1, limit = 20 } = queryParams;

  const query = { user: userId };
  if (type) query.type = String(type).toUpperCase();
  if (status) query.status = String(status).toUpperCase();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('responses.responder', 'name role')
      .lean(),
    Feedback.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Retrieve specific feedback item with full response thread.
 * Ensures user is either the author or an ADMIN.
 *
 * @param {string} feedbackId
 * @param {string} userId
 * @param {string} userRole
 * @returns {Promise<Object>}
 */
export const getFeedbackById = async (feedbackId, userId, userRole = 'USER') => {
  const feedback = await Feedback.findById(feedbackId)
    .populate('user', 'name email role phone')
    .populate('responses.responder', 'name email role');

  if (!feedback) {
    const err = new Error('Feedback or complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const isAuthor = feedback.user?._id?.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    const err = new Error('Forbidden: You are not authorized to view this feedback ticket.');
    err.statusCode = 403;
    throw err;
  }

  return feedback;
};

/**
 * Add a follow-up reply to a feedback thread.
 * If user replies: appends follow-up and updates status to IN_REVIEW if closed.
 * If admin replies: appends admin response, updates status, and notifies user.
 *
 * @param {string} feedbackId
 * @param {string} userId
 * @param {string} userRole
 * @param {Object} replyData
 * @returns {Promise<Object>}
 */
export const addReply = async (feedbackId, userId, userRole = 'USER', replyData = {}) => {
  const { message, statusChange, resolutionNote } = replyData;

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    const err = new Error('Reply message is required.');
    err.statusCode = 400;
    throw err;
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) {
    const err = new Error('Feedback or complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const isAuthor = feedback.user.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN';

  if (!isAuthor && !isAdmin) {
    const err = new Error('Forbidden: You are not authorized to reply to this ticket.');
    err.statusCode = 403;
    throw err;
  }

  const normalizedRole = isAdmin ? 'ADMIN' : userRole || 'USER';
  const previousStatus = feedback.status;

  // Append response
  feedback.responses.push({
    responder: userId,
    role: normalizedRole,
    message: trimmedMessage,
    statusChange: statusChange || null,
    respondedAt: new Date(),
  });

  // Admin response handling
  if (isAdmin) {
    if (statusChange) {
      feedback.status = statusChange;
      if (['RESOLVED', 'CLOSED'].includes(statusChange)) {
        feedback.resolvedAt = new Date();
        feedback.resolutionNote = resolutionNote || trimmedMessage;
      }
    } else if (feedback.status === 'OPEN') {
      feedback.status = 'IN_PROGRESS';
    }

    await feedback.save();

    // Notify user on every admin response or status change
    try {
      const statusText = statusChange ? ` (Status changed to ${statusChange})` : '';
      await notify({
        userId: feedback.user,
        type: 'FEEDBACK_RESPONSE',
        title: `Response on Your ${feedback.type === 'COMPLAINT' ? 'Complaint' : 'Feedback'}`,
        message: `Admin Response: "${trimmedMessage.length > 80 ? trimmedMessage.slice(0, 77) + '...' : trimmedMessage}"${statusText}`,
        channels: ['IN_APP', 'EMAIL'],
        meta: {
          feedbackId: feedback._id,
          subject: feedback.subject,
          type: feedback.type,
          status: feedback.status,
          previousStatus,
          reply: trimmedMessage,
        },
      });
    } catch (notifErr) {
      console.warn('[FeedbackService] Admin response notification error:', notifErr.message);
    }
  } else {
    // User follow-up: re-open if previously resolved/closed
    if (['RESOLVED', 'CLOSED'].includes(feedback.status)) {
      feedback.status = 'IN_REVIEW';
    }
    await feedback.save();
  }

  return await Feedback.findById(feedbackId)
    .populate('user', 'name email role phone')
    .populate('responses.responder', 'name email role');
};

/**
 * Admin updates status of a feedback or complaint ticket.
 * Automatically notifies user on status change.
 *
 * @param {string} feedbackId
 * @param {string} adminUserId
 * @param {Object} statusData
 * @returns {Promise<Object>}
 */
export const updateStatusByAdmin = async (feedbackId, adminUserId, statusData = {}) => {
  const { status, resolutionNote, remarks, adminMessage } = statusData;

  const validStatuses = ['OPEN', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    const err = new Error(`Valid status required (${validStatuses.join(', ')}).`);
    err.statusCode = 400;
    throw err;
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) {
    const err = new Error('Feedback not found.');
    err.statusCode = 404;
    throw err;
  }

  const previousStatus = feedback.status;
  const newStatus = status.toUpperCase();

  feedback.status = newStatus;
  if (['RESOLVED', 'CLOSED'].includes(newStatus)) {
    feedback.resolvedAt = new Date();
    feedback.resolutionNote = resolutionNote || remarks || '';
  }

  if (adminMessage) {
    feedback.responses.push({
      responder: adminUserId,
      role: 'ADMIN',
      message: adminMessage,
      statusChange: newStatus,
      respondedAt: new Date(),
    });
  }

  await feedback.save();

  // Notify user of status change
  try {
    await notify({
      userId: feedback.user,
      type: 'FEEDBACK_STATUS_CHANGED',
      title: `Status Update: ${feedback.type === 'COMPLAINT' ? 'Complaint' : 'Feedback'} is now ${newStatus}`,
      message: `Your ticket "${feedback.subject}" status has been updated from ${previousStatus} to ${newStatus}.${
        resolutionNote ? ` Resolution: ${resolutionNote}` : ''
      }`,
      channels: ['IN_APP', 'EMAIL'],
      meta: {
        feedbackId: feedback._id,
        type: feedback.type,
        subject: feedback.subject,
        previousStatus,
        status: newStatus,
        resolutionNote: feedback.resolutionNote,
      },
    });
  } catch (notifErr) {
    console.warn('[FeedbackService] Status notification error:', notifErr.message);
  }

  return feedback;
};
