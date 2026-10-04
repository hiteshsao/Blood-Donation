import * as bloodBankService from '../services/bloodbank.service.js';

/**
 * GET /api/v1/bloodbank/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const profile = await bloodBankService.getBloodBankProfile(req.bloodBank._id);
    res.status(200).json({
      success: true,
      bloodBank: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/bloodbank/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const updated = await bloodBankService.updateBloodBankProfile(req.bloodBank._id, req.body);
    res.status(200).json({
      success: true,
      message: 'Blood bank profile updated successfully.',
      bloodBank: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bloodbank/inventory
 */
export const getInventory = async (req, res, next) => {
  try {
    const result = await bloodBankService.getBloodBankInventory(req.bloodBank._id);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/bloodbank/inventory/:group
 * Stock adjustment using transactions and negative stock prevention
 */
export const updateGroupStock = async (req, res, next) => {
  try {
    const rawGroup = req.params.group;
    const result = await bloodBankService.updateGroupStock(
      req.bloodBank._id,
      rawGroup,
      req.body,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: `Inventory stock updated for group ${result.bloodGroup}.`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/bloodbank/donations
 * Record incoming donation linked to donor + appointment
 */
export const recordDonation = async (req, res, next) => {
  try {
    const result = await bloodBankService.recordIncomingDonation(
      req.bloodBank._id,
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: 'Incoming donation recorded successfully.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/bloodbank/issue
 * Record issued units linked to approved/fulfilled blood request
 */
export const issueUnits = async (req, res, next) => {
  try {
    const result = await bloodBankService.recordIssuedUnits(
      req.bloodBank._id,
      req.body,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Blood units successfully issued.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bloodbank/requests
 * Get eligible blood requests available for issuing units
 */
export const getRequests = async (req, res, next) => {
  try {
    const requests = await bloodBankService.getEligibleRequests(req.bloodBank._id, req.query);
    res.status(200).json({
      success: true,
      data: requests,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bloodbank/history
 * Unified paginated timeline of donations and issued units
 */
export const getHistory = async (req, res, next) => {
  try {
    const result = await bloodBankService.getBloodBankHistory(req.bloodBank._id, req.query);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};


