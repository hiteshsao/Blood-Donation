import { Hospital, BloodRequest, User } from '../models/index.js';
import { notify } from './notification.service.js';
import { toGeoJSONPoint } from '../utils/geo.util.js';

/**
 * Retrieve full hospital profile by ID.
 *
 * @param {string} hospitalId
 * @returns {Promise<Object>}
 */
export const getHospitalProfile = async (hospitalId) => {
  const hospital = await Hospital.findById(hospitalId).populate('user', 'name email phone role status');
  if (!hospital) {
    const err = new Error('Hospital profile not found.');
    err.statusCode = 404;
    throw err;
  }
  return hospital;
};

/**
 * Update hospital profile details.
 *
 * @param {string} hospitalId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const updateHospitalProfile = async (hospitalId, data = {}) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    const err = new Error('Hospital profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'name',
    'phone',
    'email',
    'licenseNumber',
    'emergencyContact',
    'address',
    'city',
    'state',
    'pincode',
    'contact',
    'bedCapacity',
    'emergencyServices',
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      hospital[field] = data[field];
    }
  });

  // Handle location update
  if (data.location) {
    if (data.location.coordinates && Array.isArray(data.location.coordinates)) {
      hospital.location = {
        type: 'Point',
        coordinates: [Number(data.location.coordinates[0]), Number(data.location.coordinates[1])],
      };
    } else if (data.location.lat !== undefined && data.location.lng !== undefined) {
      hospital.location = toGeoJSONPoint(Number(data.location.lat), Number(data.location.lng));
    }
  } else if (data.lat !== undefined && data.lng !== undefined) {
    hospital.location = toGeoJSONPoint(Number(data.lat), Number(data.lng));
  }

  await hospital.save();
  return hospital;
};

/**
 * Attach uploaded license document to hospital profile.
 *
 * @param {string} hospitalId
 * @param {string} licenseDocUrl
 * @param {string} licenseNumber
 * @returns {Promise<Object>}
 */
export const uploadHospitalLicense = async (hospitalId, licenseDocUrl, licenseNumber) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    const err = new Error('Hospital profile not found.');
    err.statusCode = 404;
    throw err;
  }

  hospital.licenseDocUrl = licenseDocUrl;
  if (licenseNumber) {
    hospital.licenseNumber = licenseNumber;
  }

  await hospital.save();
  return hospital;
};

/**
 * Retrieve paginated blood requests belonging to this hospital.
 *
 * @param {string} hospitalId
 * @param {string} userId
 * @param {Object} queryParams
 * @returns {Promise<Object>}
 */
export const getHospitalRequests = async (hospitalId, userId, queryParams = {}) => {
  const { status, bloodGroup, urgency, page = 1, limit = 20 } = queryParams;

  const query = {
    $or: [{ hospital: hospitalId }, { requester: userId }],
  };

  if (status) query.status = status;
  if (bloodGroup) query.bloodGroup = bloodGroup;
  if (urgency) query.urgency = urgency;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    BloodRequest.find(query)
      .populate('requester', 'name email phone')
      .populate('assignedDonors.donor', 'name bloodGroup phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    BloodRequest.countDocuments(query),
  ]);

  return {
    requests,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Hospital confirms blood units received, marking request as FULFILLED.
 *
 * @param {string} hospitalId
 * @param {string} requestId
 * @param {string} userId
 * @param {Object} details
 * @returns {Promise<Object>}
 */
export const confirmUnitsReceived = async (hospitalId, requestId, userId, details = {}) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found.');
    err.statusCode = 404;
    throw err;
  }

  // Ensure request is associated with this hospital or requester
  const isLinkedHospital =
    request.hospital && request.hospital.toString() === hospitalId.toString();
  const isRequester =
    request.requester && request.requester.toString() === userId.toString();

  if (!isLinkedHospital && !isRequester) {
    const err = new Error('Forbidden: You are not authorized to confirm units for this request.');
    err.statusCode = 403;
    throw err;
  }

  if (request.status === 'FULFILLED') {
    return {
      alreadyFulfilled: true,
      request,
      message: 'Request was already marked as FULFILLED.',
    };
  }

  if (['REJECTED', 'CANCELLED'].includes(request.status)) {
    const err = new Error(`Cannot confirm units for a ${request.status} request.`);
    err.statusCode = 400;
    throw err;
  }

  const previousStatus = request.status;
  request.status = 'FULFILLED';
  request.statusHistory.push({
    status: 'FULFILLED',
    changedBy: userId,
    note: details.remarks || `Hospital confirmed receipt of ${request.units} unit(s) of ${request.bloodGroup}.`,
    changedAt: new Date(),
  });

  await request.save();

  // Notify requester via universal notification service
  try {
    await notify({
      userId: request.requester,
      type: 'REQUEST_FULFILLED',
      title: 'Blood Units Received by Hospital! 🎉',
      message: `Hospital has confirmed receipt of ${request.units} unit(s) of ${request.bloodGroup} for ${request.patientName || 'patient'}. Request is now complete.`,
      channels: ['IN_APP', 'EMAIL'],
      meta: {
        requestId: request._id,
        hospitalId,
        previousStatus,
        status: 'FULFILLED',
        units: request.units,
        bloodGroup: request.bloodGroup,
        patientName: request.patientName,
      },
    });
  } catch (notifErr) {
    console.warn('[HospitalService] Notification failed:', notifErr.message);
  }

  return {
    alreadyFulfilled: false,
    request,
    message: 'Blood units received successfully and request marked as FULFILLED.',
  };
};
