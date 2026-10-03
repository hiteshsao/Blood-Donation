import * as feedbackService from '../services/feedback.service.js';

/**
 * POST /api/v1/feedback
 * Submit feedback or complaint
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const feedback = await feedbackService.createFeedback({
      userId: req.user._id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: `${feedback.type === 'COMPLAINT' ? 'Complaint' : 'Feedback'} submitted successfully.`,
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/feedback/my
 * Retrieve submissions for the authenticated user
 */
export const getMyFeedbacks = async (req, res, next) => {
  try {
    const result = await feedbackService.getMyFeedbacks(req.user._id, req.query);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/feedback/:id
 * Retrieve specific ticket with full response history
 */
export const getFeedbackById = async (req, res, next) => {
  try {
    const feedback = await feedbackService.getFeedbackById(
      req.params.id,
      req.user._id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/feedback/:id/reply
 * Submit a follow-up reply (User or Admin)
 */
export const addReply = async (req, res, next) => {
  try {
    const updated = await feedbackService.addReply(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Reply submitted successfully.',
      feedback: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/feedback/:id/status
 * Admin status update with notification to user
 */
export const updateStatus = async (req, res, next) => {
  try {
    const updated = await feedbackService.updateStatusByAdmin(
      req.params.id,
      req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: `Feedback status updated to ${updated.status}.`,
      feedback: updated,
    });
  } catch (error) {
    next(error);
  }
};
