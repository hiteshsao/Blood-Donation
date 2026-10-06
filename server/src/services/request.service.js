import mongoose from 'mongoose';
import { BloodRequest, DonorProfile, Hospital, Notification, User } from '../models/index.js';
import { toGeoJSONPoint } from '../utils/geo.util.js';
import { notify } from './notification.service.js';

/**
 * Valid state transitions for BloodRequest state machine:
 * PENDING -> APPROVED -> DONOR_ASSIGNED -> IN_PROGRESS -> FULFILLED
 * (plus REJECTED / CANCELLED from allowable active states)
 */
export const VALID_STATUS_TRANSITIONS = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['DONOR_ASSIGNED', 'REJECTED', 'CANCELLED'],
  DONOR_ASSIGNED: ['IN_PROGRESS', 'APPROVED', 'FULFILLED', 'CANCELLED'],
  IN_PROGRESS: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  RECEIVED: [],
  TRANSFUSED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Validates whether a state transition is legal according to the state machine.
 * Throws a 400 error with descriptive message if the transition is illegal.
 *
 * @param {string} currentStatus
 * @param {string} newStatus
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed next states: ${
        allowed && allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'
      }`
    );
    err.statusCode = 400;
    throw err;
  }
};

/**
 * Sends in-app notification to the requester on status changes.
 *
 * @param {Object} request
 * @param {string} newStatus
 * @param {Object} changedByUser
 * @param {string} [note='']
 */
export const notifyRequesterOnStatusChange = async (request, newStatus, changedByUser, note = '') => {
  const statusTitles = {
    APPROVED: 'Blood Request Approved',
    DONOR_ASSIGNED: 'Donor Assigned to Your Request',
    IN_PROGRESS: 'Donation In Progress',
    FULFILLED: 'Blood Request Fulfilled',
    CANCELLED: 'Blood Request Cancelled',
    REJECTED: 'Blood Request Rejected',
  };

  const statusMessages = {
    APPROVED: `Your blood request for ${request.units} unit(s) of ${request.bloodGroup} for ${request.patientName} has been verified and approved. We are actively matching donors.`,
    DONOR_ASSIGNED: `A voluntary blood donor has been assigned to your request for ${request.patientName}.`,
    IN_PROGRESS: `The donation process is currently in progress for your request.`,
    FULFILLED: `Great news! The hospital has confirmed receipt of the requested blood units. Your request is now fulfilled.`,
    CANCELLED: `Your blood request for ${request.patientName} (${request.bloodGroup}) was cancelled.${note ? ` Reason: ${note}` : ''}`,
    REJECTED: `Your blood request could not be approved.${note ? ` Reason: ${note}` : ''}`,
  };

  const title = statusTitles[newStatus] || `Request Status Updated: ${newStatus}`;
  const message =
    statusMessages[newStatus] ||
    `Your request status has changed to ${newStatus}.${note ? ` Note: ${note}` : ''}`;

  try {
    const requesterId = request.requester?._id || request.requester;
    const res = await notify({
      userId: requesterId,
      type: `REQUEST_${newStatus}`,
      title,
      message,
      channels: ['IN_APP', 'EMAIL', 'SMS'],
      meta: {
        requestId: request._id,
        status: newStatus,
        patientName: request.patientName,
        bloodGroup: request.bloodGroup,
        units: request.units,
        note,
      },
    });
    return res.notification;
  } catch (err) {
    console.error('[RequestService] Failed to create notification:', err.message);
    return null;
  }
};

/**
 * Parse location input into GeoJSON Point.
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
 * Create a new blood request.
 * - USER or HOSPITAL can create
 * - hospitalId is automatically linked if the user has role 'HOSPITAL'
 * - Initial state is PENDING with statusHistory entry
 * - Triggers notification to requester
 *
 * @param {string} userId
 * @param {string} userRole
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const createBloodRequest = async (userId, userRole, data) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  let hospitalId = null;
  let hospitalName = '';

  // Case 1: If created by a user with role HOSPITAL, link their hospitalId automatically
  // Ignore any hospital name text field provided in this case.
  if (userRole === 'HOSPITAL') {
    const hospital = await Hospital.findOne({
      $or: [{ user: userId }, { createdBy: userId }],
    });
    if (!hospital) {
      const err = new Error('Hospital profile not found for this account.');
      err.statusCode = 404;
      throw err;
    }
    hospitalId = user.hospitalId || hospital._id;
    hospitalName = hospital.name;
  } else {
    // Case 2: Created by regular USER role
    const inputHospitalId = data.hospital || data.hospitalId;
    if (inputHospitalId) {
      const hospital = await Hospital.findById(inputHospitalId);
      if (!hospital) {
        const err = new Error('Selected hospital was not found in the verified registry.');
        err.statusCode = 400;
        throw err;
      }
      hospitalId = hospital._id;
      hospitalName = hospital.name;
    } else if (data.hospitalName && data.hospitalName.trim()) {
      const foundHospital =
        (await Hospital.findOne({ name: new RegExp('^' + data.hospitalName.trim() + '$', 'i') })) ||
        (await Hospital.findOne({ name: new RegExp(data.hospitalName.trim(), 'i') })) ||
        (await Hospital.findOne({ city: new RegExp('^' + city + '$', 'i') })) ||
        (await Hospital.findOne());

      if (foundHospital) {
        hospitalId = foundHospital._id;
        hospitalName = foundHospital.name;
      } else {
        hospitalName = '';
      }
    }
  }

  const bloodGroup = data.bloodGroup?.trim().toUpperCase();
  const units = parseInt(data.units, 10);
  const city = data.city?.trim() || user.city || '';
  const patientName = data.patientName?.trim();

  if (!patientName) {
    const err = new Error('Patient name is required');
    err.statusCode = 400;
    throw err;
  }

  if (!bloodGroup) {
    const err = new Error('Blood group is required');
    err.statusCode = 400;
    throw err;
  }

  if (!units || units < 1) {
    const err = new Error('At least 1 unit must be requested');
    err.statusCode = 400;
    throw err;
  }

  if (!city) {
    const err = new Error('City is required');
    err.statusCode = 400;
    throw err;
  }

  const contactNumber = data.contactNumber?.trim() || data.contactPhone?.trim() || user.phone || user.mobile || '';
  const location = parseLocation(data.location || user.location);

  const initialStatus = 'PENDING';
  const initialHistory = [
    {
      status: initialStatus,
      changedBy: userId,
      note: data.notes || 'Blood request created',
      changedAt: new Date(),
    },
  ];

  // Resolve targeted donor if provided
  let assignedDonors = [];
  const targetDonorInput = data.donorId || data.targetedDonor;
  let targetDonorUser = null;

  if (targetDonorInput) {
    try {
      if (mongoose.Types.ObjectId.isValid(targetDonorInput)) {
        targetDonorUser = await User.findById(targetDonorInput);
        if (!targetDonorUser) {
          let dProfile = await DonorProfile.findById(targetDonorInput).populate('user');
          if (!dProfile) {
            dProfile = await DonorProfile.findOne({ user: targetDonorInput }).populate('user');
          }
          if (dProfile?.user) {
            targetDonorUser = dProfile.user._id ? dProfile.user : await User.findById(dProfile.user);
          }
        }
      }
      if (!targetDonorUser) {
        const matchingProfile = await DonorProfile.findOne({
          bloodGroup,
          isAvailable: true,
        }).populate('user');
        if (matchingProfile?.user) {
          targetDonorUser = matchingProfile.user._id ? matchingProfile.user : await User.findById(matchingProfile.user);
        }
      }
      if (targetDonorUser) {
        assignedDonors.push({
          donor: targetDonorUser._id,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        });
      }
    } catch (e) {
      console.warn('[RequestService] Unable to resolve targeted donor:', e.message);
    }
  }

  const request = await BloodRequest.create({
    requester: userId,
    hospital: hospitalId,
    hospitalName,
    patientName,
    bloodGroup,
    units,
    city,
    urgency: data.urgency ? data.urgency.toUpperCase() : 'ROUTINE',
    status: initialStatus,
    contactNumber,
    notes: data.notes || '',
    location,
    assignedDonors,
    matchedDonors: assignedDonors,
    statusHistory: initialHistory,
  });

  // Notification for request creation to requester
  try {
    await notify({
      userId,
      type: 'REQUEST_CREATED',
      title: 'Blood Request Submitted',
      message: `Your request for ${units} unit(s) of ${bloodGroup} for ${patientName} has been submitted successfully (Status: PENDING).`,
      channels: ['IN_APP', 'EMAIL'],
      meta: {
        requestId: request._id,
        status: initialStatus,
        patientName,
        bloodGroup,
        units,
      },
    });
  } catch (notifErr) {
    console.error('[RequestService] Notification creation failed:', notifErr.message);
  }

  // Notification to targeted donor if present
  if (targetDonorUser) {
    try {
      await notify({
        userId: targetDonorUser._id,
        type: 'REQUEST_DONOR_ASSIGNED',
        title: 'New Blood Request Match',
        message: `You have been directly requested for a donation of ${units} unit(s) of ${bloodGroup} for patient ${patientName} in ${city}.`,
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        meta: {
          requestId: request._id,
          patientName,
          bloodGroup,
          units,
        },
      });
    } catch (dNotifErr) {
      console.error('[RequestService] Targeted donor notification failed:', dNotifErr.message);
    }
  }

  return request;
};

/**
 * Retrieve paginated requests for the authenticated user / hospital.
 *
 * @param {string} userId
 * @param {string} userRole
 * @param {Object} query
 * @returns {Promise<Object>}
 */
export const getMyBloodRequests = async (
  userId,
  userRole,
  { status, urgency, page = 1, limit = 10 } = {}
) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (userRole === 'HOSPITAL') {
    const hospital = await Hospital.findOne({
      $or: [{ user: userId }, { createdBy: userId }],
    });
    if (hospital) {
      filter.$or = [{ requester: userId }, { hospital: hospital._id }];
    } else {
      filter.requester = userId;
    }
  } else {
    filter.requester = userId;
  }

  if (status) {
    filter.status = status.trim().toUpperCase();
  }

  if (urgency) {
    filter.urgency = urgency.trim().toUpperCase();
  }

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .populate('hospital', 'name address city phone licenseNumber')
      .populate('assignedDonors.donor', 'name bloodGroup phone city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    BloodRequest.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    requests,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

/**
 * Get request by ID with complete statusHistory.
 *
 * @param {string} requestId
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>}
 */
export const getBloodRequestById = async (requestId, user) => {
  const request = await BloodRequest.findById(requestId)
    .populate('requester', 'name email phone city profilePhoto')
    .populate('hospital', 'name address city phone licenseNumber')
    .populate('assignedDonors.donor', 'name bloodGroup phone city profilePhoto')
    .populate('statusHistory.changedBy', 'name email role');

  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check: requester, assigned donor, linked hospital, or admin
  const isRequester = request.requester?._id?.toString() === user._id.toString();
  const isAdmin = user.role === 'ADMIN';

  let isLinkedHospital = false;
  if (user.role === 'HOSPITAL' && request.hospital) {
    const userHospital = await Hospital.findOne({
      $or: [{ user: user._id }, { createdBy: user._id }],
    });
    if (userHospital && userHospital._id.toString() === request.hospital._id?.toString()) {
      isLinkedHospital = true;
    }
  }

  const isAssignedDonor = (request.assignedDonors || []).some(
    (d) => d.donor?._id?.toString() === user._id.toString()
  );

  if (!isRequester && !isAdmin && !isLinkedHospital && !isAssignedDonor) {
    const err = new Error('You do not have permission to view this blood request');
    err.statusCode = 403;
    throw err;
  }

  return request;
};

/**
 * Transition request status according to state machine.
 *
 * @param {string} requestId
 * @param {string} newStatus
 * @param {Object} user
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const transitionRequestStatus = async (requestId, newStatus, user, { note = '' } = {}) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = request.status;
  const targetStatus = newStatus.trim().toUpperCase();

  // Enforce state machine rules
  validateStatusTransition(currentStatus, targetStatus);

  // Update status & append history
  request.status = targetStatus;
  request.statusHistory.push({
    status: targetStatus,
    changedBy: user._id,
    note: note || `Status transitioned from ${currentStatus} to ${targetStatus}`,
    changedAt: new Date(),
  });

  await request.save();

  // Notify requester
  await notifyRequesterOnStatusChange(request, targetStatus, user, note);

  return request;
};

/**
 * Cancel a blood request.
 * - Enforces state machine: only allowed from PENDING, APPROVED, DONOR_ASSIGNED, IN_PROGRESS
 * - Adds statusHistory entry
 * - Notifies requester
 *
 * @param {string} requestId
 * @param {Object} user
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const cancelBloodRequest = async (requestId, user, { reason = '' } = {}) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  const isRequester = request.requester?.toString() === user._id.toString();
  const isAdmin = user.role === 'ADMIN';

  let isLinkedHospital = false;
  if (user.role === 'HOSPITAL' && request.hospital) {
    const userHospital = await Hospital.findOne({
      $or: [{ user: user._id }, { createdBy: user._id }],
    });
    if (userHospital && userHospital._id.toString() === request.hospital.toString()) {
      isLinkedHospital = true;
    }
  }

  if (!isRequester && !isAdmin && !isLinkedHospital) {
    const err = new Error('You do not have permission to cancel this blood request');
    err.statusCode = 403;
    throw err;
  }

  // Validate state machine
  validateStatusTransition(request.status, 'CANCELLED');

  const note = reason || 'Request cancelled by user';
  request.status = 'CANCELLED';
  request.statusHistory.push({
    status: 'CANCELLED',
    changedBy: user._id,
    note,
    changedAt: new Date(),
  });

  await request.save();

  // Notify requester
  await notifyRequesterOnStatusChange(request, 'CANCELLED', user, note);

  return request;
};

/**
 * Hospital confirms units received.
 * - Transitions request to FULFILLED
 * - Enforces state machine
 * - Records statusHistory
 * - Triggers notification to requester
 *
 * @param {string} requestId
 * @param {Object} user
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const confirmReceived = async (requestId, user, { note = '', unitsReceived } = {}) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found');
    err.statusCode = 404;
    throw err;
  }

  // Only HOSPITAL or ADMIN can confirm receipt
  if (user.role !== 'HOSPITAL' && user.role !== 'ADMIN') {
    const err = new Error('Only hospital representatives or administrators can confirm receipt of units');
    err.statusCode = 403;
    throw err;
  }

  // Ensure request is associated with a hospital (not a purely regular user request)
  if (!request.hospital) {
    const err = new Error('Forbidden: Only hospital-associated requests can have receipt confirmed.');
    err.statusCode = 403;
    throw err;
  }

  // Strict ObjectId check for hospital: request.hospital === req.user.hospitalId
  if (user.role === 'HOSPITAL') {
    const userHospitalId = user.hospitalId || (await Hospital.findOne({
      $or: [{ user: user._id }, { createdBy: user._id }],
    }))?._id;

    if (!userHospitalId || request.hospital.toString() !== userHospitalId.toString()) {
      const err = new Error('Forbidden: You are not authorized to confirm units for this request. Only the assigned hospital can confirm receipt.');
      err.statusCode = 403;
      throw err;
    }
  }

  if (['REJECTED', 'CANCELLED'].includes(request.status)) {
    const err = new Error(`Cannot confirm units for a ${request.status} request.`);
    err.statusCode = 400;
    throw err;
  }

  // Validate state machine if transitioning from active non-fulfilled state
  if (request.status !== 'FULFILLED' && request.status !== 'COMPLETED') {
    validateStatusTransition(request.status, 'FULFILLED');
  }

  const unitsCount = unitsReceived || request.units;
  const fulfillmentNote =
    note || `Confirmed ${unitsCount} unit(s) of ${request.bloodGroup} received and verified by hospital.`;

  const confirmTime = new Date();
  request.status = 'FULFILLED';
  request.confirmedReceived = true;
  request.confirmedAt = confirmTime;
  request.receivedAt = confirmTime;
  request.confirmedBy = user._id;

  request.statusHistory.push({
    status: 'FULFILLED',
    changedBy: user._id,
    note: fulfillmentNote,
    changedAt: confirmTime,
  });

  await request.save();

  // Notify requester
  await notifyRequesterOnStatusChange(request, 'FULFILLED', user, fulfillmentNote);

  // Notify issuing blood bank if any
  try {
    const { BloodIssue, BloodBank } = await import('../models/index.js');
    const recentIssue = await BloodIssue.findOne({ request: request._id }).sort({ issuedAt: -1 });
    if (recentIssue && recentIssue.bloodBank) {
      const bank = await BloodBank.findById(recentIssue.bloodBank);
      if (bank && bank.user) {
        await notify({
          userId: bank.user,
          type: 'REQUEST_COMPLETED',
          title: 'Hospital Confirmed Blood Units Received! ✓',
          message: `Hospital has confirmed receipt of ${request.units} unit(s) of ${request.bloodGroup} for patient ${request.patientName || ''}. Transfusion loop closed.`,
          channels: ['IN_APP', 'EMAIL'],
          meta: {
            requestId: request._id,
            bloodGroup: request.bloodGroup,
            units: request.units,
            hospitalId: request.hospital,
          },
        });
      }
    }
  } catch (bbNotifErr) {
    console.warn('[RequestService] Blood bank notification failed:', bbNotifErr.message);
  }

  return request;
};
