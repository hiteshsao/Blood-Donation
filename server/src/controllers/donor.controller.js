import * as donorService from '../services/donor.service.js';

/**
 * PUT /api/v1/donor/availability
 */
export const updateAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const result = await donorService.setDonorAvailability(req.user._id, isAvailable);
    res.status(200).json({
      success: true,
      message: `Donor availability set to ${isAvailable ? 'Available' : 'Unavailable'}.`,
      isAvailable: result.donorProfile.isAvailable,
      donorProfile: result.donorProfile,
    });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * GET /api/v1/donor/eligibility
 */
export const getEligibility = async (req, res, next) => {
  try {
    const result = await donorService.checkDonorEligibility(req.user._id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * GET /api/v1/donor/history
 */
export const getHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await donorService.getDonorHistory(req.user._id, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * GET /api/v1/donor/dashboard-stats
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const result = await donorService.getDonorDashboardStats(req.user._id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};
