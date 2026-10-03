import * as profileService from '../services/profile.service.js';

/**
 * GET /api/v1/profile/me
 */
export const getMe = async (req, res, next) => {
  try {
    const result = await profileService.getUserProfile(req.user._id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * PUT /api/v1/profile/me
 */
export const updateMe = async (req, res, next) => {
  try {
    const result = await profileService.updateUserProfile(req.user._id, req.body);
    res.status(200).json({ success: true, message: 'Profile updated successfully.', ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * PUT /api/v1/profile/address
 */
export const updateAddress = async (req, res, next) => {
  try {
    const result = await profileService.updateAddressLocation(req.user._id, req.body);
    res.status(200).json({ success: true, message: 'Address and location updated.', ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * POST /api/v1/profile/photo
 */
export const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload as your profile photo.',
      });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    const result = await profileService.setProfilePhoto(req.user._id, photoUrl);
    res.status(200).json({ success: true, message: 'Profile photo uploaded.', ...result });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * POST /api/v1/profile/become-donor
 */
export const becomeDonor = async (req, res, next) => {
  try {
    const result = await profileService.becomeDonor(req.user._id, req.body);
    res.status(201).json({
      success: true,
      message: 'Successfully enrolled as a voluntary blood donor!',
      ...result,
    });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};

/**
 * PUT /api/v1/profile/donor-toggle
 */
export const donorToggle = async (req, res, next) => {
  try {
    const result = await profileService.toggleDonor(req.user._id);
    res.status(200).json({
      success: true,
      message: `Donor status toggled to ${result.isAvailable ? 'Available' : 'Unavailable'}.`,
      ...result,
    });
  } catch (error) {
    if (error.statusCode) res.statusCode = error.statusCode;
    next(error);
  }
};
