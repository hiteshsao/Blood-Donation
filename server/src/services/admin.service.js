import mongoose from 'mongoose';
import {
  User,
  DonorProfile,
  Hospital,
  BloodBank,
  BloodInventory,
  BloodRequest,
  EmergencyRequest,
  Donation,
  BloodIssue,
  Feedback,
  Complaint,
  AuditLog,
} from '../models/index.js';
import { auditLog } from './auditLog.service.js';
import { notify } from './notification.service.js';
import { VALID_STATUS_TRANSITIONS, validateStatusTransition } from './request.service.js';
import { updateGroupStock } from './bloodbank.service.js';
import { escalateEmergencyRequest } from './emergency.service.js';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const normalizeBloodGroup = (bg) => {
  if (!bg) return bg;
  return String(bg).replace(/\s+/g, '+').trim().toUpperCase();
};

// ── 1. USERS MANAGEMENT ──

export const getAdminUsers = async ({
  search,
  role,
  status,
  city,
  bloodGroup,
  isVerified,
  page = 1,
  limit = 20,
}) => {
  const query = {};

  if (role) query.role = String(role).toUpperCase();
  if (status) query.status = String(status).toUpperCase();
  if (city) query.city = new RegExp(city, 'i');
  if (bloodGroup) query.bloodGroup = normalizeBloodGroup(bloodGroup);
  if (isVerified !== undefined) query.isVerified = isVerified === 'true' || isVerified === true;

  if (search) {
    const s = String(search).trim();
    query.$or = [
      { name: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') },
      { phone: new RegExp(s, 'i') },
      { city: new RegExp(s, 'i') },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -passwordHash -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const verifyUser = async (userId, adminId, req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { status: user.status, isVerified: user.isVerified, isEmailVerified: user.isEmailVerified };
  user.isVerified = true;
  user.isEmailVerified = true;
  if (user.status === 'PENDING') user.status = 'ACTIVE';
  await user.save();

  await auditLog({
    action: 'USER_VERIFY',
    entity: 'User',
    entityId: user._id,
    actor: adminId,
    before,
    after: { status: user.status, isVerified: user.isVerified },
    req,
  });

  return user;
};

export const toggleUserBlock = async (userId, block, adminId, reason = '', req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { status: user.status, isBlocked: user.isBlocked };
  user.isBlocked = block;
  user.status = block ? 'BLOCKED' : 'ACTIVE';
  await user.save();

  const action = block ? 'USER_BLOCK' : 'USER_UNBLOCK';
  await auditLog({
    action,
    entity: 'User',
    entityId: user._id,
    actor: adminId,
    before,
    after: { status: user.status, isBlocked: user.isBlocked },
    meta: { reason },
    req,
  });

  // Notify user
  try {
    await notify({
      userId: user._id,
      type: block ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED',
      title: block ? 'Account Suspended' : 'Account Re-activated',
      message: block
        ? `Your account has been suspended by administration.${reason ? ` Reason: ${reason}` : ''}`
        : 'Your account has been restored and is now active.',
      channels: ['IN_APP', 'EMAIL'],
    });
  } catch (e) {
    // Non-blocking
  }

  return user;
};

export const softDeleteUser = async (userId, adminId, req = null) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { status: user.status };
  user.status = 'INACTIVE';
  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();

  await auditLog({
    action: 'USER_DELETE',
    entity: 'User',
    entityId: user._id,
    actor: adminId,
    before,
    after: { status: 'INACTIVE', isDeleted: true },
    req,
  });

  return { success: true, message: 'User soft-deleted successfully.', userId };
};

// ── 2. DONORS MANAGEMENT ──

export const getAdminDonors = async ({
  search,
  bloodGroup,
  verificationStatus,
  isAvailable,
  city,
  page = 1,
  limit = 20,
}) => {
  const query = {};

  if (bloodGroup) query.bloodGroup = normalizeBloodGroup(bloodGroup);
  if (verificationStatus) query.verificationStatus = String(verificationStatus).toUpperCase();
  if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true' || isAvailable === true;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  let donorDocs = await DonorProfile.find(query)
    .populate('user', 'name email phone mobile city bloodGroup status isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  if (search || city) {
    donorDocs = donorDocs.filter((d) => {
      const matchSearch =
        !search ||
        d.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        d.user?.phone?.includes(search);
      const matchCity = !city || d.user?.city?.toLowerCase().includes(city.toLowerCase());
      return matchSearch && matchCity;
    });
  }

  const total = await DonorProfile.countDocuments(query);

  return {
    donors: donorDocs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const setDonorVerification = async (donorId, approve, adminId, reason = '', req = null) => {
  const donor = await DonorProfile.findById(donorId).populate('user');
  if (!donor) {
    const err = new Error('Donor profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { verificationStatus: donor.verificationStatus, isVerified: donor.isVerified };
  donor.verificationStatus = approve ? 'VERIFIED' : 'REJECTED';
  donor.isVerified = approve;
  await donor.save();

  if (donor.user) {
    donor.user.isVerified = approve;
    await donor.user.save();
  }

  const action = approve ? 'DONOR_VERIFY_APPROVE' : 'DONOR_VERIFY_REJECT';
  await auditLog({
    action,
    entity: 'DonorProfile',
    entityId: donor._id,
    actor: adminId,
    before,
    after: { verificationStatus: donor.verificationStatus, isVerified: donor.isVerified },
    meta: { reason },
    req,
  });

  // Notify donor
  try {
    await notify({
      userId: donor.user._id,
      type: approve ? 'DONOR_VERIFIED' : 'DONOR_REJECTED',
      title: approve ? 'Donor Profile Verified! 🩸' : 'Donor Verification Update',
      message: approve
        ? 'Your donor profile has been verified by the medical board. You are now eligible to receive donation requests.'
        : `Your donor verification was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      channels: ['IN_APP', 'EMAIL'],
    });
  } catch (e) {}

  return donor;
};

export const blockDonor = async (donorId, adminId, reason = '', req = null) => {
  const donor = await DonorProfile.findById(donorId).populate('user');
  if (!donor) {
    const err = new Error('Donor profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { isAvailable: donor.isAvailable, verificationStatus: donor.verificationStatus };
  donor.isAvailable = false;
  donor.verificationStatus = 'REJECTED';
  await donor.save();

  if (donor.user) {
    donor.user.isBlocked = true;
    donor.user.status = 'BLOCKED';
    await donor.user.save();
  }

  await auditLog({
    action: 'DONOR_BLOCK',
    entity: 'DonorProfile',
    entityId: donor._id,
    actor: adminId,
    before,
    after: { isAvailable: false, verificationStatus: 'REJECTED' },
    meta: { reason },
    req,
  });

  if (donor.user) {
    try {
      await notify({
        userId: donor.user._id,
        type: 'ACCOUNT_BLOCKED',
        title: 'Donor Account Suspended',
        message: `Your donor account has been suspended by administration.${reason ? ` Reason: ${reason}` : ''}`,
        channels: ['IN_APP', 'EMAIL'],
      });
    } catch (e) {}
  }

  return donor;
};

// ── 3. HOSPITALS & BLOOD BANKS (FACILITIES) ──

export const getPendingFacilities = async () => {
  const [hospitals, bloodBanks] = await Promise.all([
    Hospital.find({ verificationStatus: { $in: ['PENDING', 'SUBMITTED'] } })
      .populate('user', 'name email phone')
      .lean(),
    BloodBank.find({ verificationStatus: { $in: ['PENDING', 'SUBMITTED'] } })
      .populate('user', 'name email phone')
      .lean(),
  ]);

  return {
    pendingHospitals: hospitals,
    pendingBloodBanks: bloodBanks,
    totalPending: hospitals.length + bloodBanks.length,
  };
};

export const updateFacilityVerification = async ({
  facilityType,
  facilityId,
  decision, // 'APPROVE' | 'REJECT' | 'BLOCK'
  adminId,
  reason = '',
  req = null,
}) => {
  const isHospital = facilityType === 'hospitals' || facilityType === 'HOSPITAL';
  const Model = isHospital ? Hospital : BloodBank;
  const entityName = isHospital ? 'Hospital' : 'BloodBank';

  const facility = await Model.findById(facilityId).populate('user');
  if (!facility) {
    const err = new Error(`${entityName} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const before = { verificationStatus: facility.verificationStatus, isVerified: facility.isVerified };

  let newStatus = 'PENDING';
  let isVerified = false;

  if (decision === 'APPROVE') {
    newStatus = 'VERIFIED';
    isVerified = true;
  } else if (decision === 'REJECT') {
    newStatus = 'REJECTED';
    isVerified = false;
  } else if (decision === 'BLOCK') {
    newStatus = 'BLOCKED';
    isVerified = false;
  }

  facility.verificationStatus = newStatus;
  facility.isVerified = isVerified;
  await facility.save();

  if (facility.user) {
    facility.user.status = decision === 'BLOCK' ? 'BLOCKED' : decision === 'APPROVE' ? 'ACTIVE' : facility.user.status;
    facility.user.isVerified = isVerified;
    await facility.user.save();
  }

  await auditLog({
    action: `${entityName.toUpperCase()}_${decision}`,
    entity: entityName,
    entityId: facility._id,
    actor: adminId,
    before,
    after: { verificationStatus: newStatus, isVerified },
    meta: { reason },
    req,
  });

  // Email the applicant via universal notification service
  if (facility.user) {
    try {
      const title =
        decision === 'APPROVE'
          ? `🎉 Facility Registration Approved: ${facility.name}`
          : decision === 'REJECT'
          ? `Facility Registration Not Approved: ${facility.name}`
          : `Facility Account Suspended: ${facility.name}`;

      const message =
        decision === 'APPROVE'
          ? `Congratulations! Your ${entityName} profile for "${facility.name}" has been reviewed and verified by administration. You now have full access to facility operations.`
          : decision === 'REJECT'
          ? `Your application for "${facility.name}" could not be verified at this time.${reason ? ` Remarks: ${reason}` : ''}`
          : `Your facility account has been suspended by administration.${reason ? ` Reason: ${reason}` : ''}`;

      await notify({
        userId: facility.user._id,
        type: `FACILITY_${decision}`,
        title,
        message,
        channels: ['IN_APP', 'EMAIL'],
        meta: {
          facilityId: facility._id,
          facilityName: facility.name,
          decision,
          reason,
        },
      });
    } catch (e) {}
  }

  return facility;
};

export const getAdminHospitals = async ({ search, city, verificationStatus, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (verificationStatus) query.verificationStatus = String(verificationStatus).toUpperCase();
  if (city) query.city = new RegExp(city, 'i');
  if (search) {
    const s = String(search).trim();
    query.$or = [
      { name: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') },
      { phone: new RegExp(s, 'i') },
      { licenseNumber: new RegExp(s, 'i') },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [hospitals, total] = await Promise.all([
    Hospital.find(query)
      .populate('user', 'name email phone status isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Hospital.countDocuments(query),
  ]);

  return {
    hospitals,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getAdminBloodBanks = async ({ search, city, verificationStatus, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (verificationStatus) query.verificationStatus = String(verificationStatus).toUpperCase();
  if (city) query.city = new RegExp(city, 'i');
  if (search) {
    const s = String(search).trim();
    query.$or = [
      { name: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') },
      { phone: new RegExp(s, 'i') },
      { licenseNumber: new RegExp(s, 'i') },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [bloodBanks, total] = await Promise.all([
    BloodBank.find(query)
      .populate('user', 'name email phone status isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BloodBank.countDocuments(query),
  ]);

  return {
    bloodBanks,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

// ── 4. INVENTORY ──

export const getAllBanksInventory = async ({ search, city, bloodGroup }) => {
  const bankQuery = {};
  if (city) bankQuery.city = new RegExp(city, 'i');
  if (search) {
    bankQuery.$or = [
      { name: new RegExp(search, 'i') },
      { city: new RegExp(search, 'i') },
      { licenseNumber: new RegExp(search, 'i') },
    ];
  }

  const banks = await BloodBank.find(bankQuery).lean();
  const bankIds = banks.map((b) => b._id);

  const invQuery = { bloodBank: { $in: bankIds } };
  if (bloodGroup) invQuery.bloodGroup = normalizeBloodGroup(bloodGroup);

  const inventories = await BloodInventory.find(invQuery).lean();

  const bankMap = {};
  banks.forEach((b) => {
    bankMap[b._id.toString()] = {
      bloodBank: b,
      totalAvailable: 0,
      totalReserved: 0,
      totalExpired: 0,
      groups: {},
    };
  });

  inventories.forEach((inv) => {
    const bId = inv.bloodBank.toString();
    if (bankMap[bId]) {
      const avail = inv.available ?? inv.unitsAvailable ?? 0;
      const res = inv.reserved ?? inv.unitsReserved ?? 0;
      const exp = inv.expired ?? inv.unitsExpired ?? 0;
      bankMap[bId].totalAvailable += avail;
      bankMap[bId].totalReserved += res;
      bankMap[bId].totalExpired += exp;
      bankMap[bId].groups[inv.bloodGroup] = {
        available: avail,
        reserved: res,
        expired: exp,
        threshold: inv.lowStockThreshold || 5,
        isLowStock: avail <= (inv.lowStockThreshold || 5),
      };
    }
  });

  return Object.values(bankMap);
};

export const getLowStockList = async () => {
  const inventories = await BloodInventory.find()
    .populate('bloodBank', 'name city phone contact verificationStatus')
    .lean();

  const lowStock = inventories.filter((inv) => {
    const avail = inv.available ?? inv.unitsAvailable ?? 0;
    const thresh = inv.lowStockThreshold || 5;
    return avail <= thresh;
  });

  return lowStock.map((inv) => ({
    _id: inv._id,
    bloodBank: inv.bloodBank,
    bloodGroup: inv.bloodGroup,
    availableUnits: inv.available ?? inv.unitsAvailable ?? 0,
    threshold: inv.lowStockThreshold || 5,
    lastUpdated: inv.lastUpdated || inv.updatedAt,
  }));
};

export const adminOverrideStock = async (bankId, bloodGroup, stockData, adminId, req = null) => {
  const before = await BloodInventory.findOne({ bloodBank: bankId, bloodGroup });
  const result = await updateGroupStock(bankId, bloodGroup, stockData, adminId);

  await auditLog({
    action: 'ADMIN_INVENTORY_OVERRIDE',
    entity: 'BloodInventory',
    entityId: result.inventory?._id,
    actor: adminId,
    before: { available: before?.available, reserved: before?.reserved },
    after: { available: result.available, reserved: result.reserved },
    meta: { bankId, bloodGroup, stockData },
    req,
  });

  return result;
};

// ── 5. REQUESTS ──

export const adminGetRequests = async ({ status, bloodGroup, urgency, search, page = 1, limit = 20 }) => {
  const query = {};
  if (status) query.status = String(status).toUpperCase();
  if (bloodGroup) query.bloodGroup = normalizeBloodGroup(bloodGroup);
  if (urgency) query.urgency = String(urgency).toUpperCase();

  if (search) {
    query.$or = [
      { patientName: new RegExp(search, 'i') },
      { hospitalName: new RegExp(search, 'i') },
      { city: new RegExp(search, 'i') },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    BloodRequest.find(query)
      .populate('requester', 'name email phone')
      .populate('hospital', 'name city phone')
      .populate('assignedDonors.donor', 'name bloodGroup phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
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

export const adminChangeRequestStatus = async (requestId, newStatus, adminId, note = '', req = null) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    const err = new Error('Blood request not found.');
    err.statusCode = 404;
    throw err;
  }

  validateStatusTransition(request.status, newStatus);

  const before = { status: request.status };
  request.status = newStatus;
  request.statusHistory.push({
    status: newStatus,
    changedBy: adminId,
    note: note || `Admin transitioned request status to ${newStatus}`,
    changedAt: new Date(),
  });

  await request.save();

  await auditLog({
    action: `REQUEST_${newStatus}`,
    entity: 'BloodRequest',
    entityId: request._id,
    actor: adminId,
    before,
    after: { status: newStatus },
    meta: { note },
    req,
  });

  // Notify requester
  try {
    await notify({
      userId: request.requester,
      type: `REQUEST_${newStatus}`,
      title: `Blood Request Status: ${newStatus}`,
      message: `Your request for ${request.units} unit(s) of ${request.bloodGroup} has been updated to ${newStatus}.${
        note ? ` Note: ${note}` : ''
      }`,
      channels: ['IN_APP', 'EMAIL'],
      meta: { requestId: request._id, status: newStatus },
    });
  } catch (e) {}

  return request;
};

export const adminAssignDonorToRequest = async (requestId, donorUserId, adminId, req = null) => {
  const [request, donorUser] = await Promise.all([
    BloodRequest.findById(requestId),
    User.findById(donorUserId),
  ]);

  if (!request) {
    const err = new Error('Blood request not found.');
    err.statusCode = 404;
    throw err;
  }
  if (!donorUser) {
    const err = new Error('Donor user not found.');
    err.statusCode = 404;
    throw err;
  }

  // Validate state machine: can assign donor from APPROVED, PENDING, or DONOR_ASSIGNED
  if (!['APPROVED', 'PENDING', 'DONOR_ASSIGNED'].includes(request.status)) {
    const err = new Error(`Cannot assign donor to request in '${request.status}' status.`);
    err.statusCode = 400;
    throw err;
  }

  request.status = 'DONOR_ASSIGNED';
  request.assignedDonors.push({
    donor: donorUserId,
    status: 'ASSIGNED',
    assignedAt: new Date(),
  });
  request.statusHistory.push({
    status: 'DONOR_ASSIGNED',
    changedBy: adminId,
    note: `Admin assigned donor ${donorUser.name} (${donorUser.bloodGroup})`,
    changedAt: new Date(),
  });

  await request.save();

  await auditLog({
    action: 'REQUEST_ASSIGN_DONOR',
    entity: 'BloodRequest',
    entityId: request._id,
    actor: adminId,
    meta: { donorId: donorUserId, donorName: donorUser.name },
    req,
  });

  // Notify donor and requester
  try {
    await notify({
      userId: donorUserId,
      type: 'DONOR_ASSIGNED_TO_REQUEST',
      title: 'You Have Been Assigned to a Blood Request',
      message: `You have been selected to fulfill a request for ${request.units} unit(s) of ${request.bloodGroup} at ${request.hospitalName || request.city}.`,
      channels: ['IN_APP', 'EMAIL', 'SMS'],
      meta: { requestId: request._id },
    });

    await notify({
      userId: request.requester,
      type: 'REQUEST_DONOR_ASSIGNED',
      title: 'Donor Assigned to Your Request! 🩸',
      message: `A compatible donor (${donorUser.name}, ${donorUser.bloodGroup}) has been assigned to your blood request.`,
      channels: ['IN_APP', 'EMAIL'],
      meta: { requestId: request._id, donorName: donorUser.name },
    });
  } catch (e) {}

  return request;
};

// ── 6. EMERGENCY ──

export const getLiveEmergencies = async () => {
  const emergencies = await EmergencyRequest.find({ status: 'ACTIVE' })
    .populate('requester', 'name email phone')
    .populate('hospital', 'name address city phone')
    .populate('notifiedDonors.donor', 'name bloodGroup phone city')
    .sort({ createdAt: -1 })
    .lean();

  return emergencies.map((em) => {
    const acceptedCount = (em.notifiedDonors || []).filter((d) => d.response === 'ACCEPTED').length;
    const elapsedMinutes = Math.round((Date.now() - new Date(em.createdAt).getTime()) / 60000);

    return {
      _id: em._id,
      patientName: em.patientName,
      bloodGroup: em.bloodGroup,
      unitsNeeded: em.units,
      acceptedCount,
      totalNotified: (em.notifiedDonors || []).length,
      radiusKm: em.radiusKm,
      escalationLevel: em.escalationLevel || 0,
      elapsedMinutes,
      hospitalName: em.hospitalName || em.hospital?.name || em.city,
      requester: em.requester,
      notifiedDonors: em.notifiedDonors,
      createdAt: em.createdAt,
    };
  });
};

export const coordinateEmergency = async (emergencyId, action, adminId, data = {}, req = null) => {
  const emergency = await EmergencyRequest.findById(emergencyId);
  if (!emergency) {
    const err = new Error('Emergency request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (action === 'ESCALATE') {
    const escalated = await escalateEmergencyRequest(emergencyId);
    await auditLog({
      action: 'EMERGENCY_FORCE_ESCALATE',
      entity: 'EmergencyRequest',
      entityId: emergency._id,
      actor: adminId,
      req,
    });
    return escalated;
  }

  if (action === 'ASSIGN_DONOR' && data.donorId) {
    const donor = await User.findById(data.donorId);
    if (!donor) throw new Error('Donor not found.');

    emergency.notifiedDonors.push({
      donor: donor._id,
      response: 'ACCEPTED',
      distanceKm: data.distanceKm || 0,
      respondedAt: new Date(),
    });
    await emergency.save();

    await auditLog({
      action: 'EMERGENCY_ADMIN_ASSIGN_DONOR',
      entity: 'EmergencyRequest',
      entityId: emergency._id,
      actor: adminId,
      meta: { donorId: donor._id },
      req,
    });

    return emergency;
  }

  return emergency;
};

// ── 7. DONATIONS ──

export const getAdminDonations = async ({
  bloodBankId,
  bloodGroup,
  verificationStatus,
  page = 1,
  limit = 20,
}) => {
  const query = {};
  if (bloodBankId) query.bloodBank = bloodBankId;
  if (bloodGroup) query.bloodGroup = normalizeBloodGroup(bloodGroup);
  if (verificationStatus) query.verificationStatus = String(verificationStatus).toUpperCase();

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [donations, total] = await Promise.all([
    Donation.find(query)
      .populate('donor', 'name email phone bloodGroup')
      .populate('bloodBank', 'name city')
      .populate('appointment', 'slotDate slotTime')
      .sort({ donatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Donation.countDocuments(query),
  ]);

  return {
    donations,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const verifyDonationByAdmin = async (donationId, adminId, req = null) => {
  const donation = await Donation.findById(donationId).populate('donor');
  if (!donation) {
    const err = new Error('Donation record not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { verificationStatus: donation.verificationStatus };
  donation.verificationStatus = 'VERIFIED';
  donation.verifiedByAdmin = adminId;
  if (!donation.certificateId) {
    donation.certificateId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  }
  await donation.save();

  await auditLog({
    action: 'DONATION_VERIFY',
    entity: 'Donation',
    entityId: donation._id,
    actor: adminId,
    before,
    after: { verificationStatus: 'VERIFIED', certificateId: donation.certificateId },
    req,
  });

  // Notify donor of official verification
  try {
    await notify({
      userId: donation.donor._id,
      type: 'DONATION_VERIFIED',
      title: 'Official Blood Donation Certificate Issued 🏅',
      message: `Your donation of ${donation.units} unit(s) of ${donation.bloodGroup} has been verified by the medical board (Certificate: ${donation.certificateId}).`,
      channels: ['IN_APP', 'EMAIL'],
      meta: { donationId: donation._id, certificateId: donation.certificateId },
    });
  } catch (e) {}

  return donation;
};

// ── 8. BROADCAST NOTIFICATIONS ──

export const broadcastNotifications = async ({
  target = 'ALL',
  role,
  city,
  bloodGroup,
  title,
  message,
  channels = ['IN_APP'],
  adminId,
  req = null,
}) => {
  if (!title || !message) {
    const err = new Error('title and message are required for broadcast.');
    err.statusCode = 400;
    throw err;
  }

  const query = { status: 'ACTIVE' };

  if (target === 'ROLE' && role) {
    query.role = String(role).toUpperCase();
  } else if (target === 'CITY' && city) {
    query.city = new RegExp(city, 'i');
  } else if (target === 'BLOOD_GROUP' && bloodGroup) {
    query.bloodGroup = normalizeBloodGroup(bloodGroup);
  }

  const recipients = await User.find(query).select('_id name email phone').lean();

  let sentCount = 0;
  for (const user of recipients) {
    try {
      await notify({
        userId: user._id,
        type: 'ADMIN_BROADCAST',
        title,
        message,
        channels: channels || ['IN_APP'],
        meta: { broadcastTarget: target, city, role, bloodGroup },
      });
      sentCount++;
    } catch (e) {
      // Continue batching
    }
  }

  await auditLog({
    action: 'ADMIN_BROADCAST',
    entity: 'Notification',
    actor: adminId,
    meta: { target, role, city, bloodGroup, title, totalRecipients: recipients.length, sentCount },
    req,
  });

  return {
    success: true,
    totalRecipients: recipients.length,
    sentCount,
    target,
  };
};

// ── 9. COMPLAINTS & FEEDBACK ──

export const getAdminComplaints = async ({ type, status, category, search, page = 1, limit = 20 }) => {
  const query = {};
  if (type) query.type = String(type).toUpperCase();
  if (status) query.status = String(status).toUpperCase();
  if (category) query.category = String(category).toUpperCase();

  if (search) {
    query.$or = [{ subject: new RegExp(search, 'i') }, { message: new RegExp(search, 'i') }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Feedback.find(query)
      .populate('user', 'name email phone role')
      .populate('assignedTo', 'name email')
      .populate('responses.responder', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Feedback.countDocuments(query),
  ]);

  return {
    complaints: items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const assignComplaintToAdmin = async (complaintId, assignAdminId, actorAdminId, req = null) => {
  const ticket = await Feedback.findById(complaintId);
  if (!ticket) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  ticket.assignedTo = assignAdminId;
  if (ticket.status === 'OPEN') ticket.status = 'ASSIGNED';
  await ticket.save();

  await auditLog({
    action: 'COMPLAINT_ASSIGN',
    entity: 'Feedback',
    entityId: ticket._id,
    actor: actorAdminId,
    meta: { assignedTo: assignAdminId },
    req,
  });

  return ticket;
};

export const respondToComplaint = async (complaintId, adminId, { message, status, resolutionNote } = {}, req = null) => {
  const ticket = await Feedback.findById(complaintId);
  if (!ticket) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    const err = new Error('Response message is required.');
    err.statusCode = 400;
    throw err;
  }

  ticket.responses.push({
    responder: adminId,
    role: 'ADMIN',
    message: trimmedMessage,
    statusChange: status || null,
    respondedAt: new Date(),
  });

  const before = { status: ticket.status };
  if (status) {
    ticket.status = status;
    if (['RESOLVED', 'CLOSED'].includes(status)) {
      ticket.resolvedAt = new Date();
      ticket.resolutionNote = resolutionNote || trimmedMessage;
    }
  } else if (ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') {
    ticket.status = 'IN_PROGRESS';
  }

  await ticket.save();

  await auditLog({
    action: 'COMPLAINT_RESPOND',
    entity: 'Feedback',
    entityId: ticket._id,
    actor: adminId,
    before,
    after: { status: ticket.status },
    meta: { message: trimmedMessage, resolutionNote },
    req,
  });

  // Notify ticket author
  try {
    await notify({
      userId: ticket.user,
      type: 'FEEDBACK_RESPONSE',
      title: `Update on your ticket: ${ticket.subject}`,
      message: `An administrator has responded to your ticket: "${trimmedMessage.slice(0, 100)}${trimmedMessage.length > 100 ? '...' : ''}"`,
      channels: ['IN_APP', 'EMAIL'],
      meta: { ticketId: ticket._id, status: ticket.status },
    });
  } catch (e) {}

  return ticket;
};

export const resolveComplaint = async (complaintId, adminId, { resolutionNote } = {}, req = null) => {
  const ticket = await Feedback.findById(complaintId);
  if (!ticket) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const before = { status: ticket.status };
  ticket.status = 'RESOLVED';
  ticket.resolvedAt = new Date();
  ticket.resolutionNote = resolutionNote || 'Resolved by administrator.';

  ticket.responses.push({
    responder: adminId,
    role: 'ADMIN',
    message: `Issue resolved: ${ticket.resolutionNote}`,
    statusChange: 'RESOLVED',
    respondedAt: new Date(),
  });

  await ticket.save();

  await auditLog({
    action: 'COMPLAINT_RESOLVE',
    entity: 'Feedback',
    entityId: ticket._id,
    actor: adminId,
    before,
    after: { status: 'RESOLVED', resolutionNote: ticket.resolutionNote },
    req,
  });

  try {
    await notify({
      userId: ticket.user,
      type: 'FEEDBACK_RESOLVED',
      title: `Ticket Resolved: ${ticket.subject}`,
      message: `Your ticket has been marked as RESOLVED. Resolution notes: ${ticket.resolutionNote}`,
      channels: ['IN_APP', 'EMAIL'],
      meta: { ticketId: ticket._id },
    });
  } catch (e) {}

  return ticket;
};

// ── 10. DASHBOARD STATS ──

export const getAdminDashboardStats = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalDonors,
    totalHospitals,
    totalBloodBanks,
    totalRequests,
    totalDonations,
    activeEmergencies,
    pendingDonors,
    pendingHospitals,
    pendingBloodBanks,
    pendingRequests,
    openComplaints,
    monthlyDonations,
    allInventories,
  ] = await Promise.all([
    User.countDocuments({ status: { $ne: 'INACTIVE' } }),
    DonorProfile.countDocuments(),
    Hospital.countDocuments(),
    BloodBank.countDocuments(),
    BloodRequest.countDocuments(),
    Donation.countDocuments(),
    EmergencyRequest.countDocuments({ status: 'ACTIVE' }),
    DonorProfile.countDocuments({ verificationStatus: 'PENDING' }),
    Hospital.countDocuments({ verificationStatus: 'PENDING' }),
    BloodBank.countDocuments({ verificationStatus: 'PENDING' }),
    BloodRequest.countDocuments({ status: 'PENDING' }),
    Feedback.countDocuments({ status: { $in: ['OPEN', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS'] } }),
    Donation.countDocuments({ donatedAt: { $gte: startOfMonth } }),
    BloodInventory.find().lean(),
  ]);

  // Aggregate stock across all verified banks by blood group
  const stockByGroup = {};
  ALL_BLOOD_GROUPS.forEach((g) => {
    stockByGroup[g] = 0;
  });

  allInventories.forEach((inv) => {
    if (stockByGroup[inv.bloodGroup] !== undefined) {
      stockByGroup[inv.bloodGroup] += inv.available ?? inv.unitsAvailable ?? 0;
    }
  });

  return {
    totals: {
      users: totalUsers,
      donors: totalDonors,
      hospitals: totalHospitals,
      bloodBanks: totalBloodBanks,
      requests: totalRequests,
      donations: totalDonations,
      emergencies: activeEmergencies,
    },
    pendingApprovals: {
      donors: pendingDonors,
      hospitals: pendingHospitals,
      bloodBanks: pendingBloodBanks,
      requests: pendingRequests,
      complaints: openComplaints,
    },
    activeEmergencies,
    monthlyDonations,
    stockByGroup,
  };
};

// ── 11. REPORTS AND ANALYTICS AGGREGATIONS ──
export * from './report.service.js';

