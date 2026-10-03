import { Hospital, BloodBank } from '../models/index.js';

/**
 * Middleware ensuring user is authenticated, has HOSPITAL role (or ADMIN),
 * has a linked Hospital profile, and that Hospital has VERIFIED status.
 * Attaches verified Hospital document to `req.hospital`.
 */
export const requireVerifiedHospital = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before accessing hospital resources.',
      });
    }

    if (req.user.role !== 'HOSPITAL' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to hospital accounts. Your role is '${req.user.role}'.`,
      });
    }

    // Find hospital linked to this user
    let hospital = null;
    if (req.user.role === 'ADMIN' && req.headers['x-hospital-id']) {
      hospital = await Hospital.findById(req.headers['x-hospital-id']);
    }

    if (!hospital) {
      hospital = await Hospital.findOne({
        $or: [{ user: req.user._id }, { _id: req.user.hospital }, { email: req.user.email }],
      });
    }

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital profile not found for this user account. Please register your hospital profile first.',
      });
    }

    const isVerified =
      hospital.verificationStatus === 'VERIFIED' ||
      hospital.verificationStatus === 'APPROVED' ||
      hospital.isVerified === true;

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Hospital account is pending verification (Status: ${hospital.verificationStatus}). Only VERIFIED hospitals may access this resource.`,
        verificationStatus: hospital.verificationStatus,
      });
    }

    req.hospital = hospital;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware ensuring user is authenticated, has BLOOD_BANK role (or ADMIN),
 * has a linked BloodBank profile, and that BloodBank has VERIFIED status.
 * Attaches verified BloodBank document to `req.bloodBank`.
 */
export const requireVerifiedBloodBank = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before accessing blood bank resources.',
      });
    }

    if (req.user.role !== 'BLOOD_BANK' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to blood bank accounts. Your role is '${req.user.role}'.`,
      });
    }

    // Find blood bank linked to this user
    let bloodBank = null;
    if (req.user.role === 'ADMIN' && req.headers['x-bloodbank-id']) {
      bloodBank = await BloodBank.findById(req.headers['x-bloodbank-id']);
    }

    if (!bloodBank) {
      bloodBank = await BloodBank.findOne({
        $or: [{ user: req.user._id }, { _id: req.user.bloodBank }, { email: req.user.email }],
      });
    }

    if (!bloodBank) {
      return res.status(404).json({
        success: false,
        message: 'Blood Bank profile not found for this user account. Please register your blood bank profile first.',
      });
    }

    const isVerified =
      bloodBank.verificationStatus === 'VERIFIED' ||
      bloodBank.verificationStatus === 'APPROVED' ||
      bloodBank.isVerified === true;

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Blood Bank account is pending verification (Status: ${bloodBank.verificationStatus}). Only VERIFIED blood banks may access this resource.`,
        verificationStatus: bloodBank.verificationStatus,
      });
    }

    req.bloodBank = bloodBank;
    next();
  } catch (err) {
    next(err);
  }
};
