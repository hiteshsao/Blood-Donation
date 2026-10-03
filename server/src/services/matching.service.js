import { DonorProfile } from '../models/DonorProfile.js';
import { BloodBank } from '../models/BloodBank.js';
import { BloodInventory } from '../models/BloodInventory.js';
import { calculateDistanceKm } from '../utils/geo.util.js';

/**
 * Compatibility matrix for blood donation recipient
 * Keys: recipient blood group
 * Values: array of compatible donor blood groups
 */
export const BLOOD_COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal donor
};

/**
 * Finds compatible and available donors near given coordinates
 * @param {number} lng Longitude
 * @param {number} lat Latitude
 * @param {string} recipientBloodGroup 
 * @param {number} radiusKm 
 * @returns {Promise<Array>}
 */
export const findNearbyDonors = async (lng, lat, recipientBloodGroup, radiusKm = 25) => {
  const compatibleGroups = BLOOD_COMPATIBILITY[recipientBloodGroup] || [recipientBloodGroup];

  try {
    // Attempt MongoDB $geoNear aggregation
    const results = await DonorProfile.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: {
            isAvailable: true,
            bloodGroup: { $in: compatibleGroups },
            nextEligibleDate: { $lte: new Date() },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $match: {
          'userDetails.isActive': true,
          'userDetails.isBlocked': false,
        },
      },
      {
        $project: {
          _id: 1,
          bloodGroup: 1,
          isAvailable: 1,
          totalDonations: 1,
          distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
          user: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            mobile: '$userDetails.mobile',
            email: '$userDetails.email',
            city: '$userDetails.city',
            profilePhoto: '$userDetails.profilePhoto',
          },
        },
      },
      { $sort: { distanceKm: 1 } },
    ]);

    return results;
  } catch (geoErr) {
    console.warn(`[MatchingService] $geoNear aggregation fallback: ${geoErr.message}`);
    // Manual distance fallback for tests or unindexed collections
    const donors = await DonorProfile.find({
      isAvailable: true,
      bloodGroup: { $in: compatibleGroups },
      nextEligibleDate: { $lte: new Date() },
    }).populate('user', 'name mobile email city profilePhoto isActive isBlocked');

    return donors
      .filter((d) => d.user && d.user.isActive && !d.user.isBlocked)
      .map((d) => {
        const coords = d.location?.coordinates || [0, 0];
        const dist = calculateDistanceKm([lng, lat], coords);
        return {
          _id: d._id,
          bloodGroup: d.bloodGroup,
          isAvailable: d.isAvailable,
          totalDonations: d.totalDonations,
          distanceKm: dist,
          user: d.user,
        };
      })
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
};

/**
 * Finds nearby blood banks with available stock
 */
export const findNearbyBloodBanks = async (lng, lat, bloodGroup = null, radiusKm = 50) => {
  try {
    const bloodBanks = await BloodBank.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { status: 'APPROVED' },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          registrationNumber: 1,
          address: 1,
          city: 1,
          state: 1,
          pincode: 1,
          operatingHours: 1,
          distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
        },
      },
      { $sort: { distanceKm: 1 } },
    ]);

    // Attach inventory details
    const populated = await Promise.all(
      bloodBanks.map(async (bank) => {
        const query = { bloodBank: bank._id };
        if (bloodGroup) query.bloodGroup = bloodGroup;
        const inventory = await BloodInventory.find(query).select('bloodGroup unitsAvailable');
        return {
          ...bank,
          inventory,
        };
      })
    );

    return populated;
  } catch (err) {
    console.warn(`[MatchingService] Fallback for blood banks search: ${err.message}`);
    const banks = await BloodBank.find({ status: 'APPROVED' });
    const results = [];

    for (const bank of banks) {
      const coords = bank.location?.coordinates || [0, 0];
      const dist = calculateDistanceKm([lng, lat], coords);
      if (dist <= radiusKm) {
        const query = { bloodBank: bank._id };
        if (bloodGroup) query.bloodGroup = bloodGroup;
        const inventory = await BloodInventory.find(query).select('bloodGroup unitsAvailable');
        results.push({
          ...bank.toObject(),
          distanceKm: dist,
          inventory,
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }
};
