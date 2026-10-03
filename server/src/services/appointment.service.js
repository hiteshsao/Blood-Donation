import mongoose from 'mongoose';
import {
  Appointment,
  BloodBank,
  Donation,
  DonorProfile,
  BloodInventory,
  InventoryStockLog,
  User,
  EligibilityRule,
} from '../models/index.js';
import { checkDonorEligibility } from './donor.service.js';
import { notify } from './notification.service.js';

// Standard donation time slots
export const STANDARD_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
];

export const DEFAULT_MAX_BOOKINGS_PER_SLOT = 5;

/**
 * Normalizes date to [startOfDay, endOfDay] in UTC
 */
const getDateRange = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD or valid ISO date.');
  }
  const startOfDay = new Date(d);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(d);
  endOfDay.setUTCHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

/**
 * 1. GET /slots?bloodBankId=&date=
 * Calculates available slots and remaining booking capacity for a blood bank on a given date.
 */
export const getAvailableSlots = async (bloodBankId, dateStr, maxPerSlot = DEFAULT_MAX_BOOKINGS_PER_SLOT) => {
  if (!bloodBankId) {
    const err = new Error('bloodBankId query parameter is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!dateStr) {
    const err = new Error('date query parameter is required (YYYY-MM-DD).');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(bloodBankId)) {
    const err = new Error(`Invalid blood bank ID format: ${bloodBankId}`);
    err.statusCode = 400;
    throw err;
  }

  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) {
    const err = new Error(`Blood bank not found with ID ${bloodBankId}`);
    err.statusCode = 404;
    throw err;
  }

  const { startOfDay, endOfDay } = getDateRange(dateStr);

  // Find all active booked appointments for this bank on that date (excluding CANCELLED and NO_SHOW)
  const bookedAppointments = await Appointment.find({
    bloodBank: bloodBankId,
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['BOOKED', 'RESCHEDULED', 'SCHEDULED'], $nin: ['CANCELLED', 'NO_SHOW'] },
  }).select('slotTime');

  // Count bookings per slot
  const slotCountMap = {};
  for (const appt of bookedAppointments) {
    slotCountMap[appt.slotTime] = (slotCountMap[appt.slotTime] || 0) + 1;
  }

  const maxCapacity = Number(maxPerSlot) || DEFAULT_MAX_BOOKINGS_PER_SLOT;

  const slots = STANDARD_SLOTS.map((timeSlot) => {
    const bookedCount = slotCountMap[timeSlot] || 0;
    const availableCount = Math.max(0, maxCapacity - bookedCount);
    return {
      slotTime: timeSlot,
      maxCapacity,
      bookedCount,
      availableCount,
      isAvailable: availableCount > 0,
    };
  });

  return {
    bloodBank: {
      id: bloodBank._id,
      name: bloodBank.name,
      city: bloodBank.city || bloodBank.address?.city,
      address: bloodBank.address,
      phone: bloodBank.phone || bloodBank.contact?.phone,
    },
    date: startOfDay.toISOString().split('T')[0],
    maxBookingsPerSlot: maxCapacity,
    slots,
  };
};

/**
 * 2. POST /
 * Books an appointment for an authenticated donor.
 * Enforces donor registration, verification, eligibility, and prevents double-booking.
 */
export const bookAppointment = async (userId, {
  bloodBankId,
  slotDate,
  slotTime,
  notes = '',
}) => {
  if (!bloodBankId || !slotDate || !slotTime) {
    const err = new Error('bloodBankId, slotDate, and slotTime are required.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Verify User and Donor Registration
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: userId }, { userId }],
  });

  if (!user.isDonor && !donorProfile) {
    const err = new Error('Please become a donor first');
    err.statusCode = 403;
    err.code = 'NOT_A_DONOR';
    throw err;
  }

  if (!donorProfile) {
    const err = new Error('Please become a donor first');
    err.statusCode = 403;
    err.code = 'NOT_A_DONOR';
    throw err;
  }

  if (donorProfile.verificationStatus !== 'VERIFIED') {
    const err = new Error('Your donor profile is not verified yet');
    err.statusCode = 403;
    err.code = 'DONOR_NOT_VERIFIED';
    throw err;
  }

  // 2. Verify Blood Bank exists
  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) {
    const err = new Error('Blood bank not found.');
    err.statusCode = 404;
    throw err;
  }

  // 3. Enforce Donor Eligibility Check
  const eligibility = await checkDonorEligibility(userId);
  const isEligible = eligibility.isEligible ?? eligibility.eligible;
  if (!isEligible) {
    let message = '';
    if (eligibility.checks?.gap?.eligible === false && eligibility.nextEligibleDate) {
      const dateStr = new Date(eligibility.nextEligibleDate).toISOString().split('T')[0];
      message = `You are not eligible until ${dateStr}`;
    } else if (eligibility.nextEligibleDate && new Date(eligibility.nextEligibleDate) > new Date()) {
      const dateStr = new Date(eligibility.nextEligibleDate).toISOString().split('T')[0];
      message = `You are not eligible until ${dateStr}`;
    } else {
      message = `Donor is not currently eligible to donate blood: ${eligibility.reason || eligibility.reasons?.join('. ') || 'Eligibility criteria not met.'}`;
    }
    const err = new Error(message);
    err.statusCode = 400;
    err.eligibility = eligibility;
    throw err;
  }

  const { startOfDay, endOfDay } = getDateRange(slotDate);

  // 4. Prevent Double-Booking: donor cannot have another active appointment on the same date
  const existingDonorAppointment = await Appointment.findOne({
    donor: userId,
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['BOOKED', 'RESCHEDULED', 'SCHEDULED'], $nin: ['CANCELLED', 'NO_SHOW'] },
  });

  if (existingDonorAppointment) {
    const err = new Error(
      `You already have an active appointment scheduled on this date (${existingDonorAppointment.slotTime}). Please reschedule or cancel it first.`
    );
    err.statusCode = 409;
    throw err;
  }

  // 5. Check Slot Capacity at the Blood Bank (excluding CANCELLED appointments)
  const slotBookingsCount = await Appointment.countDocuments({
    bloodBank: bloodBankId,
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    slotTime,
    status: { $in: ['BOOKED', 'RESCHEDULED', 'SCHEDULED'], $nin: ['CANCELLED', 'NO_SHOW'] },
  });

  if (slotBookingsCount >= DEFAULT_MAX_BOOKINGS_PER_SLOT) {
    const err = new Error('The selected time slot is fully booked. Please select another time slot.');
    err.statusCode = 400;
    throw err;
  }

  // 5. Create Appointment
  const appointment = await Appointment.create({
    donor: userId,
    bloodBank: bloodBankId,
    facilityType: 'BLOOD_BANK',
    slotDate: new Date(slotDate),
    slotTime,
    status: 'BOOKED',
    notes,
    reminderSent: false,
  });

  // 6. Notify Donor via IN_APP, EMAIL, and SMS
  notify({
    userId,
    type: 'APPOINTMENT_BOOKED',
    title: 'Donation Appointment Confirmed',
    message: `Your blood donation appointment at ${bloodBank.name} is confirmed for ${new Date(slotDate).toDateString()} at ${slotTime}.`,
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    meta: { appointmentId: appointment._id, bloodBankId, slotTime },
  }).catch(() => {});

  // 7. Notify Blood Bank if user is attached
  if (bloodBank.user) {
    notify({
      userId: bloodBank.user,
      type: 'NEW_DONOR_APPOINTMENT',
      title: 'New Donation Appointment Booked',
      message: `A voluntary donor scheduled an appointment on ${new Date(slotDate).toDateString()} (${slotTime}).`,
      channels: ['IN_APP'],
      meta: { appointmentId: appointment._id, donorId: userId },
    }).catch(() => {});
  }

  return await appointment.populate(['bloodBank', 'donor']);
};

/**
 * 3. PUT /:id/reschedule
 * Reschedules an active appointment to a new date/time slot.
 */
export const rescheduleAppointment = async (appointmentId, userId, userRole, {
  slotDate,
  slotTime,
  reason = '',
}) => {
  if (!slotDate || !slotTime) {
    const err = new Error('slotDate and slotTime are required for rescheduling.');
    err.statusCode = 400;
    throw err;
  }

  const appointment = await Appointment.findById(appointmentId).populate('bloodBank');
  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  // Permission check
  const isOwner = appointment.donor.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN';
  const isBankStaff = userRole === 'BLOOD_BANK' && appointment.bloodBank?.user?.toString() === userId.toString();

  if (!isOwner && !isAdmin && !isBankStaff) {
    const err = new Error('Access denied. You cannot reschedule this appointment.');
    err.statusCode = 403;
    throw err;
  }

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
    const err = new Error(`Cannot reschedule an appointment with status: ${appointment.status}.`);
    err.statusCode = 400;
    throw err;
  }

  const { startOfDay, endOfDay } = getDateRange(slotDate);

  // Check if donor already has another appointment on the target date
  const conflict = await Appointment.findOne({
    _id: { $ne: appointment._id },
    donor: appointment.donor,
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['BOOKED', 'RESCHEDULED', 'SCHEDULED'], $nin: ['CANCELLED', 'NO_SHOW'] },
  });

  if (conflict) {
    const err = new Error('You already have another active appointment booked on this date.');
    err.statusCode = 409;
    throw err;
  }

  // Check capacity for the new slot
  const slotBookingsCount = await Appointment.countDocuments({
    _id: { $ne: appointment._id },
    bloodBank: appointment.bloodBank._id || appointment.bloodBank,
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    slotTime,
    status: { $in: ['BOOKED', 'RESCHEDULED', 'SCHEDULED'], $nin: ['CANCELLED', 'NO_SHOW'] },
  });

  if (slotBookingsCount >= DEFAULT_MAX_BOOKINGS_PER_SLOT) {
    const err = new Error('The target time slot is fully booked. Please select another slot.');
    err.statusCode = 400;
    throw err;
  }

  appointment.slotDate = new Date(slotDate);
  appointment.slotTime = slotTime;
  appointment.status = 'RESCHEDULED';
  appointment.reminderSent = false;
  if (reason) {
    appointment.notes = appointment.notes ? `${appointment.notes} | Rescheduled: ${reason}` : `Rescheduled: ${reason}`;
  }

  await appointment.save();

  // Notify donor via IN_APP, EMAIL, and SMS
  notify({
    userId: appointment.donor,
    type: 'APPOINTMENT_RESCHEDULED',
    title: 'Donation Appointment Rescheduled',
    message: `Your appointment at ${appointment.bloodBank?.name || 'the blood bank'} was rescheduled to ${new Date(slotDate).toDateString()} at ${slotTime}.`,
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    meta: { appointmentId: appointment._id, slotTime },
  }).catch(() => {});

  return appointment;
};

/**
 * 4. PUT /:id/cancel
 * Cancels an active appointment.
 */
export const cancelAppointment = async (appointmentId, userId, userRole, { cancellationReason = '' }) => {
  const appointment = await Appointment.findById(appointmentId).populate('bloodBank');
  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  const isOwner = appointment.donor.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN';
  const isBankStaff = userRole === 'BLOOD_BANK' && appointment.bloodBank?.user?.toString() === userId.toString();

  if (!isOwner && !isAdmin && !isBankStaff) {
    const err = new Error('Access denied. You cannot cancel this appointment.');
    err.statusCode = 403;
    throw err;
  }

  if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
    const err = new Error(`Appointment cannot be cancelled as it is already ${appointment.status}.`);
    err.statusCode = 400;
    throw err;
  }

  appointment.status = 'CANCELLED';
  appointment.cancellationReason = cancellationReason || 'Cancelled by user';
  await appointment.save();

  // Notify
  notify({
    userId: appointment.donor,
    type: 'APPOINTMENT_CANCELLED',
    title: 'Donation Appointment Cancelled',
    message: `Your appointment for ${new Date(appointment.slotDate).toDateString()} has been cancelled.`,
    channels: ['IN_APP', 'EMAIL'],
    meta: { appointmentId: appointment._id, cancellationReason },
  }).catch(() => {});

  return appointment;
};

/**
 * 5. GET /my
 * Returns paginated appointments for the authenticated donor.
 */
export const getMyAppointments = async (userId, { status, page = 1, limit = 10 }) => {
  const query = { donor: userId };
  if (status && status !== 'ALL') {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('bloodBank', 'name address city phone email contact')
      .populate('donation')
      .sort({ slotDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Appointment.countDocuments(query),
  ]);

  return {
    appointments,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 6. GET /bank
 * For BLOOD_BANK: Returns all appointments for the authenticated blood bank user's facility.
 */
export const getBankAppointments = async (userId, userRole, {
  bloodBankId,
  date,
  status,
  page = 1,
  limit = 20,
}) => {
  let bank = null;

  if (bloodBankId && (userRole === 'ADMIN' || userRole === 'BLOOD_BANK')) {
    bank = await BloodBank.findById(bloodBankId);
  }

  if (!bank && userRole === 'BLOOD_BANK') {
    bank = await BloodBank.findOne({ $or: [{ user: userId }, { createdBy: userId }] });
  }

  if (!bank) {
    const err = new Error('No blood bank associated with this account.');
    err.statusCode = 404;
    throw err;
  }

  const query = { bloodBank: bank._id };

  if (date) {
    const { startOfDay, endOfDay } = getDateRange(date);
    query.slotDate = { $gte: startOfDay, $lte: endOfDay };
  }

  if (status && status !== 'ALL') {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('donor', 'name email phone bloodGroup gender dob')
      .populate('donation')
      .sort({ slotDate: 1, slotTime: 1 })
      .skip(skip)
      .limit(limitNum),
    Appointment.countDocuments(query),
  ]);

  return {
    bloodBank: {
      id: bank._id,
      name: bank.name,
      city: bank.city,
    },
    appointments,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 7. PUT /:id/complete
 * For BLOOD_BANK: Completes an appointment, creates Donation record, updates donor's
 * lastDonationDate & nextEligibleDate, and increments Inventory.available in a Mongo transaction.
 */
export const completeAppointment = async (appointmentId, userId, userRole, {
  units = 1,
  remarks = '',
  certificateUrl = null,
} = {}) => {
  const unitsCount = Math.max(1, Number(units) || 1);

  const appointment = await Appointment.findById(appointmentId)
    .populate('donor')
    .populate('bloodBank');

  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  if (appointment.status === 'COMPLETED') {
    const err = new Error('Appointment is already marked as COMPLETED.');
    err.statusCode = 400;
    throw err;
  }

  if (appointment.status === 'CANCELLED') {
    const err = new Error('Cannot complete a cancelled appointment.');
    err.statusCode = 400;
    throw err;
  }

  // Permission: BLOOD_BANK of that bank or ADMIN
  const bank = appointment.bloodBank;
  const isBankOwner = bank?.user?.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN';

  if (!isBankOwner && !isAdmin && userRole !== 'BLOOD_BANK') {
    const err = new Error('Access denied. Only authorized blood bank personnel can complete appointments.');
    err.statusCode = 403;
    throw err;
  }

  const donorUser = appointment.donor;
  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: donorUser._id }, { userId: donorUser._id }],
  });

  const bloodGroup = donorProfile?.bloodGroup || donorUser.bloodGroup || 'O+';

  // Calculate next eligible date based on gender rules (NBTC: 90 days male/other, 120 days female)
  const gapDays = donorUser.gender === 'FEMALE' ? 120 : 90;
  const now = new Date();
  const nextEligibleDate = new Date(now.getTime() + gapDays * 86400000);

  // Execute in a MongoDB transaction with resilient standalone fallback
  const session = await mongoose.startSession();
  let donationRecord = null;

  try {
    session.startTransaction();

    // 1. Create Donation Record
    const [donation] = await Donation.create(
      [
        {
          donor: donorUser._id,
          appointment: appointment._id,
          bloodBank: bank._id,
          bloodGroup,
          units: unitsCount,
          donatedAt: now,
          verifiedByAdmin: userId,
          verificationStatus: 'VERIFIED',
          certificateUrl,
          remarks: remarks || 'Completed via appointment check-in',
        },
      ],
      { session }
    );
    donationRecord = donation;

    // 2. Update Donor Profile: lastDonationDate, nextEligibleDate, totalDonations, isAvailable = false
    if (donorProfile) {
      donorProfile.lastDonationDate = now;
      donorProfile.nextEligibleDate = nextEligibleDate;
      donorProfile.isAvailable = false; // until next eligible date
      donorProfile.totalDonations = (donorProfile.totalDonations || 0) + unitsCount;
      await donorProfile.save({ session });
    }

    // 3. Find or initialize BloodInventory and increment available & unitsAvailable & totalCollectedUnits
    let inventory = await BloodInventory.findOne(
      { bloodBank: bank._id, bloodGroup },
      null,
      { session }
    );

    if (!inventory) {
      const [newInv] = await BloodInventory.create(
        [
          {
            bloodBank: bank._id,
            bloodGroup,
            available: unitsCount,
            unitsAvailable: unitsCount,
            unitsTotalCollected: unitsCount,
            totalCollectedUnits: unitsCount,
            lastUpdated: now,
          },
        ],
        { session }
      );
      inventory = newInv;
    } else {
      inventory.available = (inventory.available || 0) + unitsCount;
      inventory.unitsAvailable = (inventory.unitsAvailable || 0) + unitsCount;
      inventory.unitsTotalCollected = (inventory.unitsTotalCollected || 0) + unitsCount;
      inventory.totalCollectedUnits = (inventory.totalCollectedUnits || 0) + unitsCount;
      inventory.lastUpdated = now;

      // Add batch unit to batches array
      if (!inventory.batches) inventory.batches = [];
      inventory.batches.push({
        unitId: `UNIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        donor: donorUser._id,
        bloodGroup,
        collectedDate: now,
        expiryDate: new Date(now.getTime() + 42 * 86400000), // whole blood 42 days
        status: 'AVAILABLE',
      });

      await inventory.save({ session });
    }

    // 4. Audit Log in InventoryStockLog
    await InventoryStockLog.create(
      [
        {
          bloodBank: bank._id,
          bloodGroup,
          changeType: 'ADD',
          unitsChanged: unitsCount,
          units: unitsCount,
          balanceAfter: inventory.available,
          performedBy: userId,
          referenceType: 'DONATION',
          referenceId: donation._id,
          reason: `Donation from appointment ${appointment._id}`,
        },
      ],
      { session }
    );

    // 5. Update Appointment status
    appointment.status = 'COMPLETED';
    appointment.donation = donation._id;
    appointment.unitsDonated = unitsCount;
    await appointment.save({ session });

    await session.commitTransaction();
  } catch (transErr) {
    await session.abortTransaction().catch(() => {});

    // If standalone MongoDB instance does not support transactions, execute operations sequentially
    if (
      transErr.message &&
      (transErr.message.includes('replica set') ||
        transErr.message.includes('Transaction numbers are only allowed'))
    ) {
      // 1. Create Donation Record
      const donation = await Donation.create({
        donor: donorUser._id,
        appointment: appointment._id,
        bloodBank: bank._id,
        bloodGroup,
        units: unitsCount,
        donatedAt: now,
        verifiedByAdmin: userId,
        verificationStatus: 'VERIFIED',
        certificateUrl,
        remarks: remarks || 'Completed via appointment check-in',
      });
      donationRecord = donation;

      // 2. Update Donor Profile
      if (donorProfile) {
        donorProfile.lastDonationDate = now;
        donorProfile.nextEligibleDate = nextEligibleDate;
        donorProfile.isAvailable = false;
        donorProfile.totalDonations = (donorProfile.totalDonations || 0) + unitsCount;
        await donorProfile.save();
      }

      // 3. Update Inventory
      let inventory = await BloodInventory.findOne({ bloodBank: bank._id, bloodGroup });
      if (!inventory) {
        inventory = await BloodInventory.create({
          bloodBank: bank._id,
          bloodGroup,
          available: unitsCount,
          unitsAvailable: unitsCount,
          unitsTotalCollected: unitsCount,
          totalCollectedUnits: unitsCount,
          lastUpdated: now,
        });
      } else {
        inventory.available = (inventory.available || 0) + unitsCount;
        inventory.unitsAvailable = (inventory.unitsAvailable || 0) + unitsCount;
        inventory.unitsTotalCollected = (inventory.unitsTotalCollected || 0) + unitsCount;
        inventory.totalCollectedUnits = (inventory.totalCollectedUnits || 0) + unitsCount;
        inventory.lastUpdated = now;
        await inventory.save();
      }

      // 4. Update Appointment
      appointment.status = 'COMPLETED';
      appointment.donation = donation._id;
      appointment.unitsDonated = unitsCount;
      await appointment.save();
    } else {
      throw transErr;
    }
  } finally {
    session.endSession();
  }

  // Notify donor
  notify({
    userId: donorUser._id,
    type: 'DONATION_RECORDED',
    title: 'Thank You for Donating Blood!',
    message: `Your donation of ${unitsCount} unit(s) of ${bloodGroup} blood at ${bank.name} has been processed. Your next eligible donation date is ${nextEligibleDate.toDateString()}.`,
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    meta: { appointmentId: appointment._id, donationId: donationRecord?._id, bloodGroup, units: unitsCount },
  }).catch(() => {});

  return {
    appointment,
    donation: donationRecord,
    donorNextEligibleDate: nextEligibleDate,
  };
};

/**
 * 8. PUT /:id/no-show
 * For BLOOD_BANK: Marks appointment as NO_SHOW.
 */
export const markAppointmentNoShow = async (appointmentId, userId, userRole) => {
  const appointment = await Appointment.findById(appointmentId).populate('bloodBank');
  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    throw err;
  }

  if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
    const err = new Error(`Cannot mark appointment as NO_SHOW because it is already ${appointment.status}.`);
    err.statusCode = 400;
    throw err;
  }

  appointment.status = 'NO_SHOW';
  await appointment.save();

  notify({
    userId: appointment.donor,
    type: 'APPOINTMENT_MISSED',
    title: 'Appointment Marked as Missed',
    message: `Your appointment for ${new Date(appointment.slotDate).toDateString()} was marked as missed. You can reschedule anytime.`,
    channels: ['IN_APP', 'EMAIL'],
    meta: { appointmentId: appointment._id },
  }).catch(() => {});

  return appointment;
};

/**
 * 9. Reminder Job (24h before appointment)
 * Finds upcoming appointments occurring within the next 24 hours that haven't received a reminder.
 */
export const sendAppointmentReminders = async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24h

  // Find all active booked appointments in window where reminderSent is false
  const appointmentsToRemind = await Appointment.find({
    status: { $in: ['BOOKED', 'RESCHEDULED', 'SCHEDULED'] },
    reminderSent: { $ne: true },
    slotDate: { $gte: now, $lte: windowEnd },
  }).populate('donor bloodBank');

  let remindedCount = 0;
  const remindedIds = [];

  for (const appt of appointmentsToRemind) {
    try {
      const donorUser = appt.donor;
      const bank = appt.bloodBank;

      if (!donorUser) continue;

      await notify({
        userId: donorUser._id,
        type: 'APPOINTMENT_REMINDER_24H',
        title: 'Reminder: Blood Donation Tomorrow',
        message: `Friendly reminder that your donation appointment at ${bank?.name || 'the blood bank'} is scheduled for tomorrow at ${appt.slotTime}. Please stay hydrated!`,
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        meta: { appointmentId: appt._id, slotTime: appt.slotTime, email: donorUser.email },
      });

      appt.reminderSent = true;
      await appt.save();
      remindedCount++;
      remindedIds.push(appt._id);
    } catch (e) {
      console.warn(`[AppointmentReminder] Failed for ${appt._id}: ${e.message}`);
    }
  }

  return { remindedCount, remindedIds };
};
