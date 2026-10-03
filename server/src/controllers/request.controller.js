import {
  createBloodRequest,
  getMyBloodRequests,
  getBloodRequestById,
  cancelBloodRequest,
  confirmReceived,
  transitionRequestStatus,
} from '../services/request.service.js';

/**
 * POST /api/v1/requests
 * USER or HOSPITAL creates a request; hospitalId is auto-linked for hospital role.
 */
export const createRequest = async (req, res, next) => {
  try {
    const request = await createBloodRequest(req.user._id, req.user.role, req.body);
    res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/requests/my
 * Get paginated requests created by or assigned to the authenticated user/hospital.
 */
export const getMyRequests = async (req, res, next) => {
  try {
    const { status, urgency, page, limit } = req.query;
    const result = await getMyBloodRequests(req.user._id, req.user.role, {
      status,
      urgency,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Requests retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/requests/:id
 * Get request by ID with complete statusHistory.
 */
export const getRequestById = async (req, res, next) => {
  try {
    const request = await getBloodRequestById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/requests/:id/cancel
 * Cancel a blood request with state machine check.
 */
export const cancelRequest = async (req, res, next) => {
  try {
    const { reason, note } = req.body;
    const request = await cancelBloodRequest(req.params.id, req.user, {
      reason: reason || note,
    });

    res.status(200).json({
      success: true,
      message: 'Blood request cancelled successfully',
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/requests/:id/confirm-received
 * Hospital confirms units received, fulfilling the request.
 */
export const confirmReceivedUnits = async (req, res, next) => {
  try {
    const { note, unitsReceived } = req.body;
    const request = await confirmReceived(req.params.id, req.user, {
      note,
      unitsReceived,
    });

    res.status(200).json({
      success: true,
      message: 'Blood units confirmed received and request fulfilled',
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/requests/:id/status
 * Transition request status according to strict state machine.
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const request = await transitionRequestStatus(req.params.id, status, req.user, { note });

    res.status(200).json({
      success: true,
      message: `Request status transitioned to ${status}`,
      request,
    });
  } catch (error) {
    next(error);
  }
};
