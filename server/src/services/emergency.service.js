import {
  EmergencyRequest,
  DonorProfile,
  BloodRequest,
  Notification,
  User,
  Hospital,
} from '../models/index.js';
import { calculateDistanceKm, toGeoJSONPoint } from '../utils/geo.util.js';
import { sendEmail } from './email.service.js';
import { notify } from './notification.service.js';
import {
  emitToUser,
  emitToEmergencyRoom,
  broadcastEmergencyAlert,
} from '../config/socket.js';
import { maskPhone } from './search.service.js';

/**
 * Blood group compatibility map:
 * Keys: Recipient blood group
 * Values: Compatible donor blood groups
 */
export const RECIPIENT_COMPATIBILITY_MAP = {
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
 * Donor to compatible recipient blood groups:
 * Keys: Donor blood group
 * Values: Recipient blood groups the donor can give blood to
 */
export const DONOR_COMPATIBILITY_MAP = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * Parse location input into GeoJSON Point format.
 */
const parseLocation = (location) => {
  if (!location) return { type: 'Point', coordinates: [0, 0] };

  if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);
    if (!isNaN(lng) && !isNaN(lat)) return toGeoJSONPoint(lat, lng);
  }

  if (location.lat !== undefined && location.lng !== undefined) {
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    if (!isNaN(lat) && !isNaN(lng)) return toGeoJSONPoint(lat, lng);
  }

  if (location.latitude !== undefined && location.longitude !== undefined) {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (!isNaN(lat) && !isNaN(lng)) return toGeoJSONPoint(lat, lng);
  }

  return { type: 'Point', coordinates: [0, 0] };
};

/**
 * Finds verified, available, eligible donors of compatible blood groups within a radius.
 *
 * @param {Object} params
 * @param {string} params.recipientBloodGroup
 * @param {Object} params.location - GeoJSON Point { type: 'Point', coordinates: [lng, lat] }
 * @param {number} params.radiusKm
 * @param {string[]} [params.excludeUserIds=[]] - IDs of donors already notified
 * @returns {Promise<Array>}
 */
export const findCompatibleDonors = async ({
  recipientBloodGroup,
  location,
  radiusKm = 15,
  excludeUserIds = [],
}) => {
  const compatibleGroups =
    RECIPIENT_COMPATIBILITY_MAP[recipientBloodGroup] || [recipientBloodGroup];

  const now = new Date();
  const minDob = new Date(now.getFullYear() - 65, now.getMonth(), now.getDate());
  const maxDob = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());

  const excludeObjectIds = excludeUserIds
    .filter(Boolean)
    .map((id) => (typeof id === 'string' ? id : id.toString()));

  const matchQuery = {
    isAvailable: true,
    status: 'ACTIVE',
    $or: [{ verificationStatus: 'VERIFIED' }, { isVerified: true }],
    nextEligibleDate: { $lte: now },
    bloodGroup: { $in: compatibleGroups },
    $and: [
      {
        $or: [
          { weight: { $gte: 50 } },
          { weight: null },
          { weight: { $exists: false } },
        ],
      },
      {
        $or: [
          { dob: { $gte: minDob, $lte: maxDob } },
          { dob: null },
          { dob: { $exists: false } },
        ],
      },
    ],
  };

  const hasCoords =
    location?.coordinates &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    (location.coordinates[0] !== 0 || location.coordinates[1] !== 0);

  let matchedDonors = [];

  if (hasCoords) {
    const lng = Number(location.coordinates[0]);
    const lat = Number(location.coordinates[1]);

    try {
      const results = await DonorProfile.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: radiusKm * 1000,
            spherical: true,
            query: matchQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDoc',
          },
        },
        { $unwind: '$userDoc' },
        {
          $match: {
            'userDoc.status': { $ne: 'BLOCKED' },
            'userDoc.isBlocked': { $ne: true },
          },
        },
        {
          $project: {
            _id: 1,
            bloodGroup: 1,
            isAvailable: 1,
            isVerified: 1,
            distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
            user: {
              _id: '$userDoc._id',
              name: '$userDoc.name',
              email: '$userDoc.email',
              phone: { $ifNull: ['$userDoc.phone', '$userDoc.mobile'] },
              city: '$userDoc.city',
            },
          },
        },
        { $sort: { distanceKm: 1 } },
      ]);

      matchedDonors = results.filter(
        (d) => !excludeObjectIds.includes(d.user._id.toString())
      );
    } catch (geoErr) {
      console.warn(`[EmergencyService] $geoNear fallback: ${geoErr.message}`);

      const raw = await DonorProfile.find(matchQuery).populate(
        'user',
        'name email phone mobile city status isBlocked'
      );

      matchedDonors = raw
        .filter((d) => {
          if (!d.user || d.user.status === 'BLOCKED' || d.user.isBlocked) return false;
          if (excludeObjectIds.includes(d.user._id.toString())) return false;
          return true;
        })
        .map((d) => {
          const coords = d.location?.coordinates || [0, 0];
          const dist = calculateDistanceKm([lng, lat], coords);
          return {
            _id: d._id,
            bloodGroup: d.bloodGroup,
            isAvailable: d.isAvailable,
            isVerified: d.isVerified,
            distanceKm: dist,
            user: {
              _id: d.user._id,
              name: d.user.name,
              email: d.user.email,
              phone: d.user.phone || d.user.mobile,
              city: d.user.city,
            },
          };
        })
        .filter((d) => d.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
  } else {
    // Non-coordinate fallback
    const raw = await DonorProfile.find(matchQuery).populate(
      'user',
      'name email phone mobile city status isBlocked'
    );

    matchedDonors = raw
      .filter((d) => {
        if (!d.user || d.user.status === 'BLOCKED' || d.user.isBlocked) return false;
        if (excludeObjectIds.includes(d.user._id.toString())) return false;
        return true;
      })
      .map((d) => ({
        _id: d._id,
        bloodGroup: d.bloodGroup,
        isAvailable: d.isAvailable,
        isVerified: d.isVerified,
        distanceKm: 0,
        user: {
          _id: d.user._id,
          name: d.user.name,
          email: d.user.email,
          phone: d.user.phone || d.user.mobile,
          city: d.user.city,
        },
      }));
  }

  return matchedDonors;
};

/**
 * Dispatches notifications (In-app + Email + Socket.io) to matched donors.
 *
 * @param {Object} emergency
 * @param {Array} matchedDonors
 */
export const notifyMatchedDonors = async (emergency, matchedDonors) => {
  const donorUserIds = [];

  for (const donor of matchedDonors) {
    const uid = donor.user?._id;
    if (!uid) continue;
    donorUserIds.push(uid.toString());

    const distanceText = donor.distanceKm ? ` (~${donor.distanceKm} km away)` : '';
    const hospitalText = emergency.hospitalName ? ` at ${emergency.hospitalName}` : '';

    // Dispatches via universal notify service (IN_APP + EMAIL + SMS)
    try {
      await notify({
        userId: uid,
        type: 'EMERGENCY_ALERT',
        title: `🚨 EMERGENCY: Blood Needed Immediately (${emergency.bloodGroup})`,
        message: `Urgent requirement for ${emergency.units} unit(s) of ${emergency.bloodGroup}${hospitalText}${distanceText}. Your blood type is a compatible match! Please respond ASAP.`,
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        meta: {
          emergencyId: emergency._id.toString(),
          patientName: emergency.patientName,
          bloodGroup: emergency.bloodGroup,
          units: emergency.units,
          hospitalName: emergency.hospitalName,
          distanceKm: donor.distanceKm,
        },
      });
    } catch (err) {
      console.error(`[EmergencyService] notify failed for donor ${uid}:`, err.message);
    }
  }

  // Socket.io Event Emission
  broadcastEmergencyAlert(emergency, donorUserIds);
};

/**
 * Schedule in-memory 15-minute auto-escalation timer for an emergency request.
 *
 * @param {string} emergencyId
 */
export const scheduleAutoEscalationTimer = (emergencyId) => {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_ESCALATION_TIMER_IN_TEST) {
    return;
  }

  const timeoutMs = process.env.ESCALATION_TEST_DELAY_MS
    ? parseInt(process.env.ESCALATION_TEST_DELAY_MS, 10)
    : 15 * 60 * 1000; // 15 minutes default

  const timer = setTimeout(async () => {
    try {
      await escalateEmergencyRequest(emergencyId);
    } catch (err) {
      console.error(
        `[EmergencyService] Auto-escalation timer error for ${emergencyId}:`,
        err.message
      );
    }
  }, timeoutMs);

  if (timer && timer.unref) {
    timer.unref();
  }
};

/**
 * POST /api/v1/emergency
 * Creates an emergency request, auto-matches compatible donors, and notifies them.
 *
 * @param {string} userId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const createEmergencyRequest = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const bloodGroup = data.bloodGroup?.trim().toUpperCase();
  const units = parseInt(data.units, 10);
  const city = data.city?.trim() || user.city || '';
  const patientName = data.patientName?.trim() || 'Emergency Patient';
  const radiusKm = Math.max(1, parseFloat(data.radiusKm) || 15);

  let hospitalId = data.hospital || data.hospitalId || null;
  let hospitalName = data.hospitalName || '';

  if (user.role === 'HOSPITAL') {
    const hospital = await Hospital.findOne({
      $or: [{ user: userId }, { createdBy: userId }],
    });
    if (hospital) {
      hospitalId = hospital._id;
      hospitalName = hospital.name;
    }
  } else if (hospitalId && !hospitalName) {
    const hospital = await Hospital.findById(hospitalId);
    if (hospital) hospitalName = hospital.name;
  }

  const location = parseLocation(data.location || user.location);

  // 1. Create linked BloodRequest for record-keeping
  const bloodRequest = await BloodRequest.create({
    requester: userId,
    hospital: hospitalId,
    hospitalName,
    patientName,
    bloodGroup,
    units,
    city,
    urgency: 'EMERGENCY',
    status: 'IN_PROGRESS',
    contactNumber: data.contactNumber?.trim() || user.phone || user.mobile || '',
    notes: data.notes || 'Emergency request generated',
    location,
    statusHistory: [
      {
        status: 'PENDING',
        changedBy: userId,
        note: 'Emergency request created',
        changedAt: new Date(),
      },
      {
        status: 'IN_PROGRESS',
        changedBy: userId,
        note: 'Auto-matching compatible voluntary donors',
        changedAt: new Date(),
      },
    ],
  });

  // 2. Create EmergencyRequest document
  const emergency = await EmergencyRequest.create({
    requester: userId,
    hospital: hospitalId,
    patientName,
    bloodGroup,
    units,
    city,
    urgency: 'CRITICAL',
    status: 'ACTIVE',
    radiusKm,
    initialRadiusKm: radiusKm,
    escalationLevel: 0,
    location,
    bloodRequest: bloodRequest._id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  // 3. Find compatible eligible donors
  const matchedDonors = await findCompatibleDonors({
    recipientBloodGroup: bloodGroup,
    location,
    radiusKm,
    excludeUserIds: [userId],
  });

  // 4. Update notifiedDonors list on emergency document
  emergency.notifiedDonors = matchedDonors.map((d) => ({
    donor: d.user._id,
    response: 'PENDING',
    status: 'PENDING',
    distanceKm: d.distanceKm || 0,
    notifiedAt: new Date(),
  }));
  await emergency.save();

  // 5. Notify donors via In-App, Email, and Socket.io
  await notifyMatchedDonors(emergency, matchedDonors);

  // 6. Schedule 15-minute auto-escalation timer
  scheduleAutoEscalationTimer(emergency._id);

  return {
    emergency,
    matchedDonorsCount: matchedDonors.length,
    initialRadiusKm: radiusKm,
    bloodRequest,
  };
};

/**
 * GET /api/v1/emergency/nearby
 * Returns active emergencies compatible with the authenticated donor.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getNearbyEmergencies = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });

  const donorBloodGroup = donorProfile?.bloodGroup || user.bloodGroup;
  if (!donorBloodGroup) {
    const activeEmergencies = await EmergencyRequest.find({
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
    })
      .populate('requester', 'name phone mobile city profilePhoto')
      .populate('hospital', 'name address city phone licenseNumber')
      .sort({ createdAt: -1 })
      .limit(20);

    return activeEmergencies.map((em) => {
      const doc = em.toObject ? em.toObject() : em;
      return {
        ...doc,
        distanceKm: 0,
        isCompatible: true,
      };
    });
  }

  // Determine which recipient blood groups this donor can donate to
  const compatibleRecipientGroups = DONOR_COMPATIBILITY_MAP[donorBloodGroup] || [donorBloodGroup];

  const donorLocation = donorProfile?.location || user.location;
  const donorCoords = donorLocation?.coordinates || [0, 0];

  // Find all ACTIVE emergencies compatible with this donor
  const emergencies = await EmergencyRequest.find({
    status: 'ACTIVE',
    bloodGroup: { $in: compatibleRecipientGroups },
    expiresAt: { $gt: new Date() },
  })
    .populate('requester', 'name phone mobile city profilePhoto')
    .populate('hospital', 'name address city phone licenseNumber')
    .sort({ createdAt: -1 });

  // Filter emergencies within search radius or where donor was explicitly notified
  const results = emergencies
    .map((em) => {
      const emCoords = em.location?.coordinates || [0, 0];
      const distanceKm =
        donorCoords[0] !== 0 && donorCoords[1] !== 0 && emCoords[0] !== 0 && emCoords[1] !== 0
          ? calculateDistanceKm(donorCoords, emCoords)
          : 0;

      const notificationEntry = em.notifiedDonors.find(
        (n) => n.donor?.toString() === userId.toString()
      );

      const donorResponse = notificationEntry ? notificationEntry.response : 'UNANSWERED';

      const acceptedCount = em.notifiedDonors.filter((n) => n.response === 'ACCEPTED').length;

      return {
        _id: em._id,
        patientName: em.patientName,
        bloodGroup: em.bloodGroup,
        unitsNeeded: em.units,
        acceptedCount,
        city: em.city,
        hospitalName: em.hospital?.name || em.hospitalName || '',
        urgency: em.urgency,
        radiusKm: em.radiusKm,
        createdAt: em.createdAt,
        distanceKm,
        donorResponse,
        isNotified: Boolean(notificationEntry),
      };
    })
    .filter((em) => {
      // Include if donor was explicitly notified OR within radius
      return em.isNotified || em.distanceKm <= em.radiusKm;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
};

/**
 * POST /api/v1/emergency/:id/respond
 * Donor responds: { response: 'ACCEPTED' | 'REJECTED' }
 * Auto-marks FULFILLED when accepted donors >= units needed.
 *
 * @param {string} emergencyId
 * @param {string} userId
 * @param {string} responseValue
 * @returns {Promise<Object>}
 */
export const respondToEmergency = async (emergencyId, userId, responseValue) => {
  const normalizedResponse = responseValue?.trim().toUpperCase();
  if (!['ACCEPTED', 'REJECTED'].includes(normalizedResponse)) {
    const err = new Error('Response must be either ACCEPTED or REJECTED');
    err.statusCode = 400;
    throw err;
  }

  const emergency = await EmergencyRequest.findById(emergencyId);
  if (!emergency) {
    const err = new Error('Emergency request not found');
    err.statusCode = 404;
    throw err;
  }

  if (emergency.status === 'FULFILLED') {
    const err = new Error('This emergency request has already been fulfilled by other donors');
    err.statusCode = 400;
    throw err;
  }

  if (['EXPIRED', 'CANCELLED'].includes(emergency.status)) {
    const err = new Error(`Emergency request is ${emergency.status.toLowerCase()}`);
    err.statusCode = 400;
    throw err;
  }

  const donorUser = await User.findById(userId);

  // Update or insert into notifiedDonors
  let donorEntry = emergency.notifiedDonors.find(
    (n) => n.donor?.toString() === userId.toString()
  );

  if (donorEntry) {
    donorEntry.response = normalizedResponse;
    donorEntry.status = normalizedResponse;
    donorEntry.respondedAt = new Date();
  } else {
    emergency.notifiedDonors.push({
      donor: userId,
      response: normalizedResponse,
      status: normalizedResponse,
      distanceKm: 0,
      notifiedAt: new Date(),
      respondedAt: new Date(),
    });
  }

  // Count current accepted donors
  const acceptedDonorsList = emergency.notifiedDonors.filter((n) => n.response === 'ACCEPTED');
  const acceptedCount = acceptedDonorsList.length;

  let isFulfilled = false;

  // Auto-mark FULFILLED when accepted donors >= units needed
  if (acceptedCount >= emergency.units) {
    emergency.status = 'FULFILLED';
    isFulfilled = true;

    // Fulfill linked BloodRequest if present
    if (emergency.bloodRequest) {
      await BloodRequest.findByIdAndUpdate(emergency.bloodRequest, {
        status: 'FULFILLED',
        $push: {
          statusHistory: {
            status: 'FULFILLED',
            changedBy: userId,
            note: `Emergency request fulfilled: ${acceptedCount} donor(s) accepted for ${emergency.units} unit(s).`,
            changedAt: new Date(),
          },
        },
      });
    }

    // Notify requester that emergency is completely fulfilled
    try {
      await notify({
        userId: emergency.requester,
        type: 'EMERGENCY_FULFILLED',
        title: '🎉 Emergency Blood Request FULFILLED!',
        message: `All ${emergency.units} required unit(s) of ${emergency.bloodGroup} have been fulfilled by voluntary donors!`,
        channels: ['IN_APP', 'EMAIL'],
        meta: {
          emergencyId: emergency._id,
          acceptedCount,
          units: emergency.units,
          bloodGroup: emergency.bloodGroup,
        },
      });
    } catch (e) {
      console.error('[EmergencyService] Notification failed:', e.message);
    }

    // Real-time Socket.io events
    emitToEmergencyRoom(emergency._id, 'emergency_fulfilled', {
      emergencyId: emergency._id,
      acceptedCount,
      units: emergency.units,
    });
    emitToUser(emergency.requester, 'emergency_fulfilled', {
      emergencyId: emergency._id,
      acceptedCount,
      units: emergency.units,
    });
  } else if (normalizedResponse === 'ACCEPTED') {
    // Notify requester that a donor accepted
    try {
      await notify({
        userId: emergency.requester,
        type: 'DONOR_ACCEPTED_EMERGENCY',
        title: 'Donor Accepted Your Emergency Request!',
        message: `${donorUser?.name || 'A voluntary donor'} (${donorUser?.bloodGroup || emergency.bloodGroup}) accepted your emergency request (${acceptedCount}/${emergency.units} units accepted).`,
        channels: ['IN_APP', 'EMAIL'],
        meta: {
          emergencyId: emergency._id,
          donorId: userId,
          acceptedCount,
          units: emergency.units,
        },
      });
    } catch (e) {
      console.error('[EmergencyService] Notification failed:', e.message);
    }

    emitToEmergencyRoom(emergency._id, 'donor_accepted', {
      emergencyId: emergency._id,
      donorName: donorUser?.name,
      acceptedCount,
      unitsNeeded: emergency.units,
    });
    emitToUser(emergency.requester, 'donor_accepted', {
      emergencyId: emergency._id,
      donorName: donorUser?.name,
      acceptedCount,
      unitsNeeded: emergency.units,
    });
  }

  await emergency.save();

  return {
    emergency,
    response: normalizedResponse,
    acceptedCount,
    unitsNeeded: emergency.units,
    isFulfilled,
  };
};

/**
 * GET /api/v1/emergency/:id/progress
 * Returns units needed vs accepted and donor breakdown.
 *
 * @param {string} emergencyId
 * @returns {Promise<Object>}
 */
export const getEmergencyProgress = async (emergencyId) => {
  const emergency = await EmergencyRequest.findById(emergencyId)
    .populate('notifiedDonors.donor', 'name bloodGroup phone mobile city profilePhoto')
    .populate('requester', 'name email phone city')
    .populate('hospital', 'name address city phone');

  if (!emergency) {
    const err = new Error('Emergency request not found');
    err.statusCode = 404;
    throw err;
  }

  const accepted = [];
  let pendingCount = 0;
  let rejectedCount = 0;

  (emergency.notifiedDonors || []).forEach((item) => {
    if (item.response === 'ACCEPTED') {
      const donorUser = item.donor || {};
      accepted.push({
        donorId: donorUser._id,
        name: donorUser.name || 'Anonymous Donor',
        bloodGroup: donorUser.bloodGroup || emergency.bloodGroup,
        phone: maskPhone(donorUser.phone || donorUser.mobile),
        city: donorUser.city || '',
        distanceKm: item.distanceKm,
        respondedAt: item.respondedAt,
      });
    } else if (item.response === 'REJECTED') {
      rejectedCount++;
    } else {
      pendingCount++;
    }
  });

  return {
    emergencyId: emergency._id,
    patientName: emergency.patientName,
    bloodGroup: emergency.bloodGroup,
    unitsNeeded: emergency.units,
    acceptedCount: accepted.length,
    pendingCount,
    rejectedCount,
    totalNotified: emergency.notifiedDonors.length,
    isFulfilled: emergency.status === 'FULFILLED',
    status: emergency.status,
    radiusKm: emergency.radiusKm,
    escalationLevel: emergency.escalationLevel || 0,
    acceptedDonors: accepted,
    hospitalName: emergency.hospital?.name || emergency.hospitalName || '',
    city: emergency.city,
    createdAt: emergency.createdAt,
    expiresAt: emergency.expiresAt,
  };
};

/**
 * Auto-escalates an emergency request: widens radius by 15 km (up to 100 km) and re-notifies.
 *
 * @param {string} emergencyId
 * @returns {Promise<Object>}
 */
export const escalateEmergencyRequest = async (emergencyId) => {
  const emergency = await EmergencyRequest.findById(emergencyId);
  if (!emergency) return null;

  // Only escalate if still active and not enough acceptances
  const acceptedCount = emergency.notifiedDonors.filter((n) => n.response === 'ACCEPTED').length;
  if (emergency.status !== 'ACTIVE' || acceptedCount >= emergency.units) {
    return null;
  }

  // Widen radius by 15 km up to 100 km max
  const previousRadius = emergency.radiusKm;
  const newRadius = Math.min(100, previousRadius + 15);

  emergency.radiusKm = newRadius;
  emergency.escalationLevel = (emergency.escalationLevel || 0) + 1;
  emergency.lastEscalatedAt = new Date();

  // Find newly eligible donors who have NOT been notified yet
  const alreadyNotifiedIds = emergency.notifiedDonors.map((n) => n.donor.toString());
  const newlyMatchedDonors = await findCompatibleDonors({
    recipientBloodGroup: emergency.bloodGroup,
    location: emergency.location,
    radiusKm: newRadius,
    excludeUserIds: [...alreadyNotifiedIds, emergency.requester.toString()],
  });

  // Append new donors to notifiedDonors
  newlyMatchedDonors.forEach((d) => {
    emergency.notifiedDonors.push({
      donor: d.user._id,
      response: 'PENDING',
      status: 'PENDING',
      distanceKm: d.distanceKm || 0,
      notifiedAt: new Date(),
    });
  });

  await emergency.save();

  // Notify newly matched donors
  if (newlyMatchedDonors.length > 0) {
    await notifyMatchedDonors(emergency, newlyMatchedDonors);
  }

  // Notify requester of escalation
  try {
    await notify({
      userId: emergency.requester,
      type: 'EMERGENCY_ESCALATED',
      title: 'Emergency Search Radius Widened',
      message: `Search radius widened from ${previousRadius} km to ${newRadius} km. ${newlyMatchedDonors.length} additional voluntary donor(s) notified.`,
      channels: ['IN_APP', 'EMAIL'],
      meta: {
        emergencyId: emergency._id,
        previousRadius,
        newRadius,
        additionalDonorsCount: newlyMatchedDonors.length,
      },
    });
  } catch (notifErr) {
    console.error('[EmergencyService] Escalation notification failed:', notifErr.message);
  }

  // Real-time Socket.io event to requester and emergency room
  emitToEmergencyRoom(emergency._id, 'emergency_escalated', {
    emergencyId: emergency._id,
    previousRadius,
    newRadius,
    additionalDonorsCount: newlyMatchedDonors.length,
    escalationLevel: emergency.escalationLevel,
  });
  emitToUser(emergency.requester, 'emergency_escalated', {
    emergencyId: emergency._id,
    previousRadius,
    newRadius,
    additionalDonorsCount: newlyMatchedDonors.length,
  });

  console.log(
    `[EmergencyEscalation] Emergency ${emergency._id} escalated to radius ${newRadius}km (+${newlyMatchedDonors.length} donors).`
  );

  return {
    emergency,
    previousRadius,
    newRadius,
    additionalDonorsCount: newlyMatchedDonors.length,
  };
};

/**
 * Daily/periodic cron to check for any active emergencies needing escalation.
 */
export const runEmergencyEscalationCron = async () => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Find active emergencies created more than 15 mins ago and not escalated in last 15 mins
  const emergencies = await EmergencyRequest.find({
    status: 'ACTIVE',
    createdAt: { $lte: fifteenMinutesAgo },
    $or: [
      { lastEscalatedAt: null },
      { lastEscalatedAt: { $lte: fifteenMinutesAgo } },
    ],
    radiusKm: { $lt: 100 },
  });

  const results = [];
  for (const em of emergencies) {
    const res = await escalateEmergencyRequest(em._id);
    if (res) results.push(res);
  }

  return results;
};
