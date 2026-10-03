import * as hospitalService from '../services/hospital.service.js';

/**
 * GET /api/v1/hospital/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const hospital = await hospitalService.getHospitalProfile(req.hospital._id);
    res.status(200).json({
      success: true,
      hospital,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/hospital/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const updated = await hospitalService.updateHospitalProfile(req.hospital._id, req.body);
    res.status(200).json({
      success: true,
      message: 'Hospital profile updated successfully.',
      hospital: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/hospital/license
 * Uploads hospital license document
 */
export const uploadLicense = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'License document file is required (PDF, PNG, JPG, DOCX).',
      });
    }

    const licenseDocUrl = `/uploads/documents/${req.file.filename}`;
    const updated = await hospitalService.uploadHospitalLicense(
      req.hospital._id,
      licenseDocUrl,
      req.body.licenseNumber
    );

    res.status(200).json({
      success: true,
      message: 'License document uploaded successfully.',
      licenseDocUrl,
      hospital: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/hospital/requests
 */
export const getRequests = async (req, res, next) => {
  try {
    const result = await hospitalService.getHospitalRequests(
      req.hospital._id,
      req.user._id,
      req.query
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/hospital/requests/:id/confirm-received
 * or POST /api/v1/hospital/confirm-received (body: { requestId, remarks })
 */
export const confirmReceived = async (req, res, next) => {
  try {
    const requestId = req.params.id || req.body.requestId;
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required.',
      });
    }

    const result = await hospitalService.confirmUnitsReceived(
      req.hospital._id,
      requestId,
      req.user._id,
      req.body
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
