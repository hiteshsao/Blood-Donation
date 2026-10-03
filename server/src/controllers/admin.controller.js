import * as adminService from '../services/admin.service.js';

/**
 * ── 1. USERS CONTROLLERS ──
 */

export const getUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAdminUsers(req.query);
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyUser = async (req, res, next) => {
  try {
    const user = await adminService.verifyUser(req.params.id, req.user._id, req);
    res.status(200).json({
      success: true,
      message: 'User verified successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await adminService.toggleUserBlock(req.params.id, true, req.user._id, reason, req);
    res.status(200).json({
      success: true,
      message: 'User has been blocked.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await adminService.toggleUserBlock(req.params.id, false, req.user._id, reason, req);
    res.status(200).json({
      success: true,
      message: 'User has been unblocked.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const result = await adminService.softDeleteUser(req.params.id, req.user._id, req);
    res.status(200).json({
      success: true,
      message: result.message,
      data: { userId: result.userId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 2. DONORS CONTROLLERS ──
 */

export const getDonors = async (req, res, next) => {
  try {
    const result = await adminService.getAdminDonors(req.query);
    res.status(200).json({
      success: true,
      data: result.donors,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDonor = async (req, res, next) => {
  try {
    const { approve, status, reason } = req.body;
    // Determine approve boolean: approve === true or status === 'VERIFIED'
    const isApproved = approve !== undefined ? Boolean(approve) : status === 'VERIFIED';
    const donor = await adminService.setDonorVerification(
      req.params.id,
      isApproved,
      req.user._id,
      reason,
      req
    );
    res.status(200).json({
      success: true,
      message: isApproved ? 'Donor verification approved.' : 'Donor verification rejected.',
      data: donor,
    });
  } catch (error) {
    next(error);
  }
};

export const approveDonor = async (req, res, next) => {
  try {
    const donor = await adminService.setDonorVerification(
      req.params.id,
      true,
      req.user._id,
      req.body.reason,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Donor verification approved.',
      data: donor,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectDonor = async (req, res, next) => {
  try {
    const donor = await adminService.setDonorVerification(
      req.params.id,
      false,
      req.user._id,
      req.body.reason,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Donor verification rejected.',
      data: donor,
    });
  } catch (error) {
    next(error);
  }
};

export const blockDonor = async (req, res, next) => {
  try {
    const donor = await adminService.blockDonor(
      req.params.id,
      req.user._id,
      req.body.reason,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Donor profile and account have been blocked.',
      data: donor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 3. HOSPITALS & BLOOD BANKS CONTROLLERS ──
 */

export const getPendingFacilities = async (req, res, next) => {
  try {
    const result = await adminService.getPendingFacilities();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getHospitals = async (req, res, next) => {
  try {
    const result = await adminService.getAdminHospitals(req.query);
    res.status(200).json({
      success: true,
      data: result.hospitals,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getBloodBanks = async (req, res, next) => {
  try {
    const result = await adminService.getAdminBloodBanks(req.query);
    res.status(200).json({
      success: true,
      data: result.bloodBanks,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyFacility = async (req, res, next) => {
  try {
    const { facilityType, id } = req.params;
    const { decision, reason } = req.body; // 'APPROVE' | 'REJECT' | 'BLOCK'
    const facility = await adminService.updateFacilityVerification({
      facilityType: facilityType || req.body.facilityType,
      facilityId: id,
      decision: decision ? decision.toUpperCase() : 'APPROVE',
      adminId: req.user._id,
      reason,
      req,
    });
    res.status(200).json({
      success: true,
      message: `Facility status updated to ${facility.verificationStatus}.`,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const updateHospitalVerification = async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    const facility = await adminService.updateFacilityVerification({
      facilityType: 'HOSPITAL',
      facilityId: req.params.id,
      decision: (decision || 'APPROVE').toUpperCase(),
      adminId: req.user._id,
      reason,
      req,
    });
    res.status(200).json({
      success: true,
      message: `Hospital ${facility.name} verification status: ${facility.verificationStatus}.`,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBloodBankVerification = async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    const facility = await adminService.updateFacilityVerification({
      facilityType: 'BLOOD_BANK',
      facilityId: req.params.id,
      decision: (decision || 'APPROVE').toUpperCase(),
      adminId: req.user._id,
      reason,
      req,
    });
    res.status(200).json({
      success: true,
      message: `Blood bank ${facility.name} verification status: ${facility.verificationStatus}.`,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 4. INVENTORY CONTROLLERS ──
 */

export const getAllInventories = async (req, res, next) => {
  try {
    const data = await adminService.getAllBanksInventory(req.query);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (req, res, next) => {
  try {
    const data = await adminService.getLowStockList();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const overrideStock = async (req, res, next) => {
  try {
    const { bankId, group } = req.params;
    const result = await adminService.adminOverrideStock(
      bankId,
      group,
      req.body,
      req.user._id,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Stock updated/overridden successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 5. REQUESTS CONTROLLERS ──
 */

export const getRequests = async (req, res, next) => {
  try {
    const result = await adminService.adminGetRequests(req.query);
    res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req, res, next) => {
  try {
    const request = await adminService.adminChangeRequestStatus(
      req.params.id,
      'APPROVED',
      req.user._id,
      req.body.note,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Request approved successfully.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const request = await adminService.adminChangeRequestStatus(
      req.params.id,
      'REJECTED',
      req.user._id,
      req.body.reason || req.body.note,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Request rejected.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const assignDonorToRequest = async (req, res, next) => {
  try {
    const { donorId } = req.body;
    if (!donorId) {
      return res.status(400).json({ success: false, message: 'donorId is required.' });
    }
    const request = await adminService.adminAssignDonorToRequest(
      req.params.id,
      donorId,
      req.user._id,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Donor assigned to blood request successfully.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

export const changeRequestStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required.' });
    }
    const request = await adminService.adminChangeRequestStatus(
      req.params.id,
      status.toUpperCase(),
      req.user._id,
      note,
      req
    );
    res.status(200).json({
      success: true,
      message: `Request status transitioned to ${status}.`,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 6. EMERGENCY CONTROLLERS ──
 */

export const getLiveEmergencies = async (req, res, next) => {
  try {
    const data = await adminService.getLiveEmergencies();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const coordinateEmergency = async (req, res, next) => {
  try {
    const { action, donorId, distanceKm } = req.body;
    const result = await adminService.coordinateEmergency(
      req.params.id,
      action ? action.toUpperCase() : 'ESCALATE',
      req.user._id,
      { donorId, distanceKm },
      req
    );
    res.status(200).json({
      success: true,
      message: `Emergency coordination action '${action}' processed.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 7. DONATIONS CONTROLLERS ──
 */

export const getDonations = async (req, res, next) => {
  try {
    const result = await adminService.getAdminDonations(req.query);
    res.status(200).json({
      success: true,
      data: result.donations,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDonation = async (req, res, next) => {
  try {
    const donation = await adminService.verifyDonationByAdmin(req.params.id, req.user._id, req);
    res.status(200).json({
      success: true,
      message: 'Donation verified successfully.',
      data: donation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 8. BROADCAST CONTROLLERS ──
 */

export const broadcast = async (req, res, next) => {
  try {
    const { target, role, city, bloodGroup, title, message, channels } = req.body;
    const result = await adminService.broadcastNotifications({
      target,
      role,
      city,
      bloodGroup,
      title,
      message,
      channels,
      adminId: req.user._id,
      req,
    });
    res.status(200).json({
      success: true,
      message: `Broadcast sent to ${result.sentCount} recipients.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 9. COMPLAINTS CONTROLLERS ──
 */

export const getComplaints = async (req, res, next) => {
  try {
    const result = await adminService.getAdminComplaints(req.query);
    res.status(200).json({
      success: true,
      data: result.complaints,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const assignComplaint = async (req, res, next) => {
  try {
    const { adminId } = req.body;
    const targetAdmin = adminId || req.user._id;
    const complaint = await adminService.assignComplaintToAdmin(
      req.params.id,
      targetAdmin,
      req.user._id,
      req
    );
    res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

export const respondComplaint = async (req, res, next) => {
  try {
    const { message, status, resolutionNote } = req.body;
    const complaint = await adminService.respondToComplaint(
      req.params.id,
      req.user._id,
      { message, status, resolutionNote },
      req
    );
    res.status(200).json({
      success: true,
      message: 'Response posted successfully.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveComplaint = async (req, res, next) => {
  try {
    const { resolutionNote } = req.body;
    const complaint = await adminService.resolveComplaint(
      req.params.id,
      req.user._id,
      { resolutionNote },
      req
    );
    res.status(200).json({
      success: true,
      message: 'Complaint marked as resolved.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 10. DASHBOARD STATS CONTROLLERS ──
 */

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getAdminDashboardStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ── 11. REPORTS AND ANALYTICS CONTROLLERS ──
 */
export { getReports, exportReport } from './report.controller.js';

