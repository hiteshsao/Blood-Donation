import { User, DonorProfile } from '../models/index.js';
import { toGeoJSONPoint } from '../utils/geo.util.js';

/**
 * Get full user profile with linked donor profile / facility
 * @param {string} userId
 * @returns {Promise<{user: Object, donorProfile: Object|null}>}
 */
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });

  return { user, donorProfile };
};

/**
 * Update user profile fields.
 * @param {string} userId
 * @param {Object} fields – editable profile fields
 * @returns {Promise<{user: Object, donorProfile: Object|null}>}
 */
export const updateUserProfile = async (userId, fields) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const {
    name,
    mobile,
    dob,
    gender,
    bloodGroup,
    emergencyContact,
  } = fields;

  if (name !== undefined) user.name = name.trim();
  if (mobile !== undefined) {
    user.mobile = mobile.trim();
    user.phone = mobile.trim();
  }
  if (dob !== undefined) user.dob = dob ? new Date(dob) : null;
  if (gender !== undefined) user.gender = gender;
  if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;

  // Emergency Contact
  if (emergencyContact && typeof emergencyContact === 'object') {
    user.emergencyContact = {
      name: emergencyContact.name !== undefined
        ? emergencyContact.name.trim()
        : (user.emergencyContact?.name || ''),
      relation: emergencyContact.relation !== undefined
        ? emergencyContact.relation.trim()
        : (user.emergencyContact?.relation || ''),
      phone: emergencyContact.phone !== undefined
        ? emergencyContact.phone.trim()
        : (user.emergencyContact?.phone || ''),
    };
  }

  await user.save();

  // Sync DonorProfile if exists
  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });
  if (donorProfile) {
    if (user.bloodGroup) donorProfile.bloodGroup = user.bloodGroup;
    if (user.dob) donorProfile.dob = user.dob;
    if (user.location && user.location.coordinates) {
      donorProfile.location = user.location;
    }
    await donorProfile.save();
  }

  return { user, donorProfile };
};

/**
 * Update user address and geolocation.
 * Accepts nested address object + location (various formats).
 *
 * @param {string} userId
 * @param {Object} fields
 * @returns {Promise<{user: Object}>}
 */
export const updateAddressLocation = async (userId, fields) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const { address, city, state, pincode, location } = fields;

  // Update address sub-document
  if (address !== undefined) {
    if (typeof address === 'string') {
      user.address = { ...user.address?.toObject?.() || user.address || {}, line: address.trim() };
    } else if (typeof address === 'object') {
      if (address.line !== undefined) user.address.line = address.line.trim();
      if (address.city !== undefined) {
        user.address.city = address.city.trim();
        user.city = address.city.trim();
      }
      if (address.state !== undefined) {
        user.address.state = address.state.trim();
        user.state = address.state.trim();
      }
      if (address.pincode !== undefined) {
        user.address.pincode = address.pincode.trim();
        user.pincode = address.pincode.trim();
      }
    }
  }

  // Flat convenience fields
  if (city !== undefined) {
    user.city = city.trim();
    if (user.address) user.address.city = city.trim();
  }
  if (state !== undefined) {
    user.state = state.trim();
    if (user.address) user.address.state = state.trim();
  }
  if (pincode !== undefined) {
    user.pincode = pincode.trim();
    if (user.address) user.address.pincode = pincode.trim();
  }

  // Geolocation – accepts multiple input formats
  if (location) {
    const point = parseLocation(location);
    if (point) {
      user.location = point;
    }
  }

  await user.save();

  // Sync donor profile location
  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });
  if (donorProfile && user.location && user.location.coordinates) {
    donorProfile.location = user.location;
    await donorProfile.save();
  }

  return { user };
};

/**
 * Upload profile photo – stores the path and syncs both fields.
 * @param {string} userId
 * @param {string} photoPath – relative URL path (e.g. /uploads/profiles/xyz.jpg)
 * @returns {Promise<{user: Object, profilePhotoUrl: string}>}
 */
export const setProfilePhoto = async (userId, photoPath) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  user.profilePhotoUrl = photoPath;
  user.profilePhoto = photoPath;
  await user.save();

  return { user, profilePhotoUrl: photoPath };
};

/**
 * Enrol a user as a voluntary blood donor.
 * Creates or reactivates a DonorProfile and upgrades role from USER → DONOR.
 *
 * @param {string} userId
 * @param {Object} fields – { bloodGroup, weightKg, medicalNotes }
 * @returns {Promise<{user: Object, donorProfile: Object}>}
 */
export const becomeDonor = async (userId, fields) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const { bloodGroup, weightKg, medicalNotes } = fields;
  const finalBloodGroup = bloodGroup || user.bloodGroup;

  if (!finalBloodGroup) {
    const err = new Error('Please provide a valid blood group to register as a donor.');
    err.statusCode = 400;
    throw err;
  }

  let donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });

  if (donorProfile) {
    // Reactivate existing profile
    donorProfile.isAvailable = true;
    donorProfile.status = 'ACTIVE';
    donorProfile.bloodGroup = finalBloodGroup;
    if (weightKg) donorProfile.weight = Number(weightKg);
    if (medicalNotes !== undefined) donorProfile.medicalNotes = medicalNotes;
    if (user.location && user.location.coordinates) {
      donorProfile.location = user.location;
    }
    if (user.dob) donorProfile.dob = user.dob;
    await donorProfile.save();
  } else {
    donorProfile = await DonorProfile.create({
      user: userId,
      bloodGroup: finalBloodGroup,
      isAvailable: true,
      isVerified: false,
      status: 'ACTIVE',
      weight: weightKg ? Number(weightKg) : null,
      dob: user.dob || null,
      medicalNotes: medicalNotes || '',
      location: user.location || { type: 'Point', coordinates: [0, 0] },
      nextEligibleDate: new Date(),
    });
  }

  // Upgrade role if plain USER
  if (user.role === 'USER') {
    user.role = 'DONOR';
  }
  user.isDonor = true;
  if (bloodGroup && !user.bloodGroup) {
    user.bloodGroup = bloodGroup;
  }
  await user.save();

  return { user, donorProfile };
};

/**
 * Toggle donor availability on/off.
 * @param {string} userId
 * @returns {Promise<{user: Object, donorProfile: Object, isAvailable: boolean}>}
 */
export const toggleDonor = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });

  if (!donorProfile) {
    const err = new Error('No donor profile found. Please register as a donor first.');
    err.statusCode = 404;
    throw err;
  }

  donorProfile.isAvailable = !donorProfile.isAvailable;
  await donorProfile.save();

  // Also flip isDonor flag on user for quick queries
  user.isDonor = donorProfile.isAvailable;
  await user.save();

  return { user, donorProfile, isAvailable: donorProfile.isAvailable };
};

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Parse various location input formats into a GeoJSON Point.
 * Returns null if input is invalid.
 */
function parseLocation(location) {
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
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return toGeoJSONPoint(lat, lng);
    }
  }
  return null;
}
