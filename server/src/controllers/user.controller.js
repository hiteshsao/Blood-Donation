import { User, DonorProfile } from '../models/index.js';
import { toGeoJSONPoint } from '../utils/geo.util.js';

/**
 * Get current authenticated user profile
 * GET /api/users/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const donorProfile = await DonorProfile.findOne({
      $or: [{ user: user._id }, { userId: user._id }],
    });

    res.status(200).json({
      success: true,
      user,
      donorProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * PUT /api/users/me
 */
export const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const {
      name,
      mobile,
      dob,
      gender,
      bloodGroup,
      address,
      city,
      state,
      pincode,
      emergencyContact,
      location,
    } = req.body;

    if (name !== undefined) user.name = name.trim();
    if (mobile !== undefined) user.mobile = mobile.trim();
    if (dob !== undefined) user.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) user.gender = gender;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (state !== undefined) user.state = state.trim();
    if (pincode !== undefined) user.pincode = pincode.trim();

    // Emergency Contact
    if (emergencyContact && typeof emergencyContact === 'object') {
      user.emergencyContact = {
        name: emergencyContact.name !== undefined ? emergencyContact.name.trim() : (user.emergencyContact?.name || ''),
        relation: emergencyContact.relation !== undefined ? emergencyContact.relation.trim() : (user.emergencyContact?.relation || ''),
        phone: emergencyContact.phone !== undefined ? emergencyContact.phone.trim() : (user.emergencyContact?.phone || ''),
      };
    }

    // Geolocation capture & GeoJSON Point formatting
    if (location) {
      let lng = null;
      let lat = null;

      if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        lng = Number(location.coordinates[0]);
        lat = Number(location.coordinates[1]);
      } else if (location.longitude !== undefined && location.latitude !== undefined) {
        lng = Number(location.longitude);
        lat = Number(location.latitude);
      } else if (location.lng !== undefined && location.lat !== undefined) {
        lng = Number(location.lng);
        lat = Number(location.lat);
      } else if (Array.isArray(location) && location.length === 2) {
        lng = Number(location[0]);
        lat = Number(location[1]);
      }

      if (lng !== null && lat !== null && !isNaN(lng) && !isNaN(lat)) {
        // Enforce valid coordinate bounds
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          user.location = toGeoJSONPoint(lat, lng);
        }
      }
    }

    await user.save();

    // Keep DonorProfile synced if exists
    const donorProfile = await DonorProfile.findOne({
      $or: [{ user: user._id }, { userId: user._id }],
    });

    if (donorProfile) {
      if (user.bloodGroup) donorProfile.bloodGroup = user.bloodGroup;
      if (user.location && user.location.coordinates) {
        donorProfile.location = user.location;
      }
      await donorProfile.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
      donorProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile photo
 * POST /api/users/me/photo
 */
export const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload as your profile photo.',
      });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.profilePhotoUrl = photoUrl;
    user.profilePhoto = photoUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      profilePhotoUrl: photoUrl,
      user,
    });
  } catch (error) {
    next(error);
  }
};
