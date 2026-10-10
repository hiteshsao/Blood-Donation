import {
  createEmergencyRequest,
  getNearbyEmergencies,
  respondToEmergency,
  confirmEmergencyDonation,
  getMyEmergencies,
  getEmergencyProgress,
  escalateEmergencyRequest,
} from '../services/emergency.service.js';

/**
 * POST /api/v1/emergency
 * Creates an emergency request and triggers auto-matching + multi-channel notifications.
 */
export const createEmergency = async (req, res, next) => {
  try {
    const result = await createEmergencyRequest(req.user._id, req.body);
    res.status(201).json({
      success: true,
      message: `Emergency request created. ${result.matchedDonorsCount} compatible donor(s) alerted.`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/emergency/nearby
 * Returns active emergencies compatible with the authenticated donor.
 */
export const getNearby = async (req, res, next) => {
  try {
    const emergencies = await getNearbyEmergencies(req.user._id);
    res.status(200).json({
      success: true,
      count: emergencies.length,
      emergencies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/emergency/:id/respond
 * Donor responds: { response: 'ACCEPTED' | 'REJECTED' }
 * Auto-marks FULFILLED if accepted donors >= units needed.
 */
export const respond = async (req, res, next) => {
  try {
    const { response: responseValue } = req.body;
    if (!responseValue) {
      return res.status(400).json({
        success: false,
        message: 'response field is required (ACCEPTED or REJECTED)',
      });
    }

    const result = await respondToEmergency(
      req.params.id,
      req.user._id,
      responseValue
    );

    res.status(200).json({
      success: true,
      message: `Emergency response recorded: ${result.response}`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/emergency/:id/progress
 * Returns units needed vs accepted and donor breakdown.
 */
export const getProgress = async (req, res, next) => {
  try {
    const progress = await getEmergencyProgress(req.params.id);
    res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/emergency/:id/escalate
 * Trigger manual or test escalation for an emergency request.
 */
export const triggerEscalation = async (req, res, next) => {
  try {
    const result = await escalateEmergencyRequest(req.params.id);
    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Emergency request cannot be escalated (either already fulfilled or not found)',
      });
    }

    res.status(200).json({
      success: true,
      message: `Emergency escalated to ${result.newRadius} km (+${result.additionalDonorsCount} new donors notified)`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/emergency/:id/donors/:donorId/confirm-donated
 * Confirms that an accepted donor completed blood donation.
 */
export const confirmDonated = async (req, res, next) => {
  try {
    const result = await confirmEmergencyDonation(
      req.params.id,
      req.params.donorId,
      req.user
    );
    res.status(200).json({
      success: true,
      message: result.isFulfilled
        ? 'Donation confirmed! Emergency request has been completely fulfilled.'
        : `Donation confirmed (${result.donatedCount}/${result.unitsNeeded} units donated).`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/emergency/my
 * Returns emergency requests created by authenticated user/hospital with progress.
 */
export const getMyEmergenciesHandler = async (req, res, next) => {
  try {
    const emergencies = await getMyEmergencies(req.user._id);
    res.status(200).json({
      success: true,
      count: emergencies.length,
      emergencies,
    });
  } catch (error) {
    next(error);
  }
};

