import mongoose from 'mongoose';
import {
  BloodBank,
  BloodInventory,
  InventoryStockLog,
  Donation,
  BloodIssue,
  BloodRequest,
  Appointment,
  User,
  DonorProfile,
} from '../models/index.js';
import { notify } from './notification.service.js';
import { toGeoJSONPoint } from '../utils/geo.util.js';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const WHOLE_BLOOD_SHELF_LIFE_DAYS = 35;

/**
 * Retrieve verified blood bank profile.
 */
export const getBloodBankProfile = async (bloodBankId) => {
  const bank = await BloodBank.findById(bloodBankId).populate(
    'user',
    'name email phone role status'
  );
  if (!bank) {
    const err = new Error('Blood Bank profile not found.');
    err.statusCode = 404;
    throw err;
  }
  return bank;
};

/**
 * Update blood bank profile details.
 */
export const updateBloodBankProfile = async (bloodBankId, data = {}) => {
  const bank = await BloodBank.findById(bloodBankId);
  if (!bank) {
    const err = new Error('Blood Bank profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'name',
    'licenseNumber',
    'registrationNumber',
    'operatingHours',
    'phone',
    'email',
    'address',
    'city',
    'state',
    'pincode',
    'contact',
  ];

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      bank[field] = data[field];
    }
  });

  if (data.location) {
    if (data.location.coordinates && Array.isArray(data.location.coordinates)) {
      bank.location = {
        type: 'Point',
        coordinates: [Number(data.location.coordinates[0]), Number(data.location.coordinates[1])],
      };
    } else if (data.location.lat !== undefined && data.location.lng !== undefined) {
      bank.location = toGeoJSONPoint(Number(data.location.lat), Number(data.location.lng));
    }
  } else if (data.lat !== undefined && data.lng !== undefined) {
    bank.location = toGeoJSONPoint(Number(data.lat), Number(data.lng));
  }

  await bank.save();
  return bank;
};

/**
 * Retrieve complete inventory breakdown for a blood bank across all 8 blood groups.
 * Auto-provisions missing blood group rows with 0 units.
 */
export const getBloodBankInventory = async (bloodBankId) => {
  const inventories = await BloodInventory.find({ bloodBank: bloodBankId });

  // Map existing inventories by blood group
  const map = {};
  inventories.forEach((inv) => {
    map[inv.bloodGroup] = inv;
  });

  const fullGrid = [];
  let totalAvailable = 0;
  let totalReserved = 0;
  let totalExpired = 0;

  for (const group of ALL_BLOOD_GROUPS) {
    let inv = map[group];
    if (!inv) {
      inv = await BloodInventory.create({
        bloodBank: bloodBankId,
        bloodGroup: group,
        available: 0,
        unitsAvailable: 0,
        reserved: 0,
        unitsReserved: 0,
        expired: 0,
        unitsExpired: 0,
        lowStockThreshold: 5,
        batches: [],
      });
    }

    const available = inv.available ?? inv.unitsAvailable ?? 0;
    const reserved = inv.reserved ?? inv.unitsReserved ?? 0;
    const expired = inv.expired ?? inv.unitsExpired ?? 0;
    const threshold = inv.lowStockThreshold || 5;

    totalAvailable += available;
    totalReserved += reserved;
    totalExpired += expired;

    fullGrid.push({
      _id: inv._id,
      bloodGroup: group,
      available,
      reserved,
      expired,
      totalUnits: available + reserved,
      lowStockThreshold: threshold,
      isLowStock: available <= threshold,
      lastUpdated: inv.lastUpdated || inv.updatedAt,
      batches: inv.batches || [],
    });
  }

  return {
    bloodBankId,
    totalAvailable,
    totalReserved,
    totalExpired,
    inventory: fullGrid,
  };
};

/**
 * Update stock for a specific blood group using MongoDB transactions.
 * PREVENTS NEGATIVE STOCK: ensures available >= 0 and reserved >= 0.
 *
 * @param {string} bloodBankId
 * @param {string} rawBloodGroup
 * @param {Object} updateData
 * @param {string} userId
 */
export const updateGroupStock = async (bloodBankId, rawBloodGroup, updateData = {}, userId = null) => {
  const bloodGroup = decodeURIComponent(rawBloodGroup).trim().toUpperCase();
  if (!ALL_BLOOD_GROUPS.includes(bloodGroup)) {
    const err = new Error(`Invalid blood group '${bloodGroup}'. Must be one of ${ALL_BLOOD_GROUPS.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }

  const { action = 'SET', units, available, reserved, expired, reason = 'Manual inventory adjustment' } = updateData;

  const session = await mongoose.startSession();
  let updatedDoc = null;

  try {
    session.startTransaction();

    let inv = await BloodInventory.findOne({ bloodBank: bloodBankId, bloodGroup }, null, { session });
    if (!inv) {
      const [created] = await BloodInventory.create(
        [
          {
            bloodBank: bloodBankId,
            bloodGroup,
            available: 0,
            unitsAvailable: 0,
            reserved: 0,
            unitsReserved: 0,
            expired: 0,
            unitsExpired: 0,
            lowStockThreshold: 5,
            batches: [],
          },
        ],
        { session }
      );
      inv = created;
    }

    const prevAvailable = inv.available ?? inv.unitsAvailable ?? 0;
    let newAvailable = prevAvailable;
    let newReserved = inv.reserved ?? inv.unitsReserved ?? 0;
    let newExpired = inv.expired ?? inv.unitsExpired ?? 0;

    const deltaUnits = units !== undefined ? Number(units) : 0;

    if (action === 'ADD') {
      if (deltaUnits <= 0) {
        const err = new Error('Units to ADD must be greater than zero.');
        err.statusCode = 400;
        throw err;
      }
      newAvailable += deltaUnits;
      inv.unitsTotalCollected = (inv.unitsTotalCollected || 0) + deltaUnits;
      inv.totalCollectedUnits = (inv.totalCollectedUnits || 0) + deltaUnits;

      // Add batch
      if (!inv.batches) inv.batches = [];
      const now = new Date();
      inv.batches.push({
        unitId: `UNIT-STOCK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        bloodGroup,
        collectedDate: now,
        expiryDate: new Date(now.getTime() + WHOLE_BLOOD_SHELF_LIFE_DAYS * 86400000),
        status: 'AVAILABLE',
      });
    } else if (action === 'REMOVE') {
      if (deltaUnits <= 0) {
        const err = new Error('Units to REMOVE must be greater than zero.');
        err.statusCode = 400;
        throw err;
      }
      if (prevAvailable < deltaUnits) {
        const err = new Error(
          `Insufficient stock. Cannot remove ${deltaUnits} unit(s). Current available is ${prevAvailable}.`
        );
        err.statusCode = 400;
        throw err;
      }
      newAvailable = prevAvailable - deltaUnits;
    } else if (action === 'SET') {
      const setVal = available !== undefined ? available : units;
      if (setVal !== undefined) {
        const target = Number(setVal);
        if (target < 0) {
          const err = new Error('Available units cannot be negative.');
          err.statusCode = 400;
          throw err;
        }
        newAvailable = target;
      }
      if (reserved !== undefined) {
        const targetR = Number(reserved);
        if (targetR < 0) {
          const err = new Error('Reserved units cannot be negative.');
          err.statusCode = 400;
          throw err;
        }
        newReserved = targetR;
      }
      if (expired !== undefined) {
        const targetE = Number(expired);
        if (targetE < 0) {
          const err = new Error('Expired units cannot be negative.');
          err.statusCode = 400;
          throw err;
        }
        newExpired = targetE;
      }
    }

    // Safety checks against negative values
    if (newAvailable < 0 || newReserved < 0 || newExpired < 0) {
      const err = new Error('Negative stock is strictly forbidden.');
      err.statusCode = 400;
      throw err;
    }

    inv.available = newAvailable;
    inv.unitsAvailable = newAvailable;
    inv.reserved = newReserved;
    inv.unitsReserved = newReserved;
    inv.expired = newExpired;
    inv.unitsExpired = newExpired;
    inv.lastUpdated = new Date();

    await inv.save({ session });

    // Record audit log
    await InventoryStockLog.create(
      [
        {
          bloodBank: bloodBankId,
          bloodGroup,
          changeType: action === 'REMOVE' ? 'ISSUE' : action === 'ADD' ? 'ADD' : 'ADJUST',
          units: Math.abs(newAvailable - prevAvailable),
          unitsChanged: newAvailable - prevAvailable,
          previousAvailableUnits: prevAvailable,
          newAvailableUnits: newAvailable,
          balanceAfter: newAvailable,
          performedBy: userId,
          reason,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    updatedDoc = inv;
  } catch (transErr) {
    await session.abortTransaction().catch(() => {});

    // Graceful fallback for non-replica set MongoDB (dev/standalone)
    if (
      transErr.message &&
      (transErr.message.includes('replica set') ||
        transErr.message.includes('Transaction numbers are only allowed'))
    ) {
      let inv = await BloodInventory.findOne({ bloodBank: bloodBankId, bloodGroup });
      if (!inv) {
        inv = await BloodInventory.create({
          bloodBank: bloodBankId,
          bloodGroup,
          available: 0,
          unitsAvailable: 0,
          reserved: 0,
          unitsReserved: 0,
          expired: 0,
          unitsExpired: 0,
          lowStockThreshold: 5,
          batches: [],
        });
      }

      const prevAvailable = inv.available ?? inv.unitsAvailable ?? 0;
      let newAvailable = prevAvailable;
      let newReserved = inv.reserved ?? inv.unitsReserved ?? 0;
      let newExpired = inv.expired ?? inv.unitsExpired ?? 0;
      const deltaUnits = units !== undefined ? Number(units) : 0;

      if (action === 'ADD') {
        if (deltaUnits <= 0) {
          const err = new Error('Units to ADD must be greater than zero.');
          err.statusCode = 400;
          throw err;
        }
        newAvailable += deltaUnits;
      } else if (action === 'REMOVE') {
        if (deltaUnits <= 0) {
          const err = new Error('Units to REMOVE must be greater than zero.');
          err.statusCode = 400;
          throw err;
        }
        if (prevAvailable < deltaUnits) {
          const err = new Error(
            `Insufficient stock. Cannot remove ${deltaUnits} unit(s). Current available is ${prevAvailable}.`
          );
          err.statusCode = 400;
          throw err;
        }
        newAvailable = prevAvailable - deltaUnits;
      } else if (action === 'SET') {
        const setVal = available !== undefined ? available : units;
        if (setVal !== undefined) newAvailable = Math.max(0, Number(setVal));
        if (reserved !== undefined) newReserved = Math.max(0, Number(reserved));
        if (expired !== undefined) newExpired = Math.max(0, Number(expired));
      }

      inv.available = newAvailable;
      inv.unitsAvailable = newAvailable;
      inv.reserved = newReserved;
      inv.unitsReserved = newReserved;
      inv.expired = newExpired;
      inv.unitsExpired = newExpired;
      inv.lastUpdated = new Date();

      await inv.save();
      updatedDoc = inv;
    } else {
      throw transErr;
    }
  } finally {
    session.endSession();
  }

  return {
    bloodGroup,
    available: updatedDoc.available,
    reserved: updatedDoc.reserved,
    expired: updatedDoc.expired,
    isLowStock: updatedDoc.available <= (updatedDoc.lowStockThreshold || 5),
    inventory: updatedDoc,
  };
};

/**
 * Record an incoming donation linked to donor and optional appointment.
 * Increments Inventory.available in a transaction and sets whole blood 35-day shelf life.
 *
 * @param {string} bloodBankId
 * @param {Object} donationData
 * @param {string} staffUserId
 */
export const recordIncomingDonation = async (bloodBankId, donationData = {}, staffUserId = null) => {
  const { donorId, appointmentId, bloodGroup, units = 1, donationDate, remarks, notes } = donationData;

  if (!donorId) {
    const err = new Error('donorId is required to record donation.');
    err.statusCode = 400;
    throw err;
  }

  const donorUser = await User.findById(donorId);
  if (!donorUser) {
    const err = new Error('Donor user not found.');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await DonorProfile.findOne({
    $or: [{ user: donorId }, { userId: donorId }],
  });

  const finalBloodGroup = (bloodGroup || donorProfile?.bloodGroup || donorUser.bloodGroup || 'O+').toUpperCase();
  if (!ALL_BLOOD_GROUPS.includes(finalBloodGroup)) {
    const err = new Error(`Invalid blood group '${finalBloodGroup}'.`);
    err.statusCode = 400;
    throw err;
  }

  const unitsCount = Math.max(1, Number(units) || 1);
  const now = donationDate ? new Date(donationDate) : new Date();

  // Next eligible date: 90 days for Male, 120 days for Female (NBTC guidelines)
  const gapDays = donorUser.gender === 'FEMALE' ? 120 : 90;
  const nextEligibleDate = new Date(now.getTime() + gapDays * 86400000);
  const expiryDate = new Date(now.getTime() + WHOLE_BLOOD_SHELF_LIFE_DAYS * 86400000);

  const session = await mongoose.startSession();
  let donationDoc = null;
  let inventoryDoc = null;

  try {
    session.startTransaction();

    // 1. Create Donation Record
    const [createdDonation] = await Donation.create(
      [
        {
          donor: donorId,
          appointment: appointmentId || null,
          bloodBank: bloodBankId,
          bloodGroup: finalBloodGroup,
          units: unitsCount,
          donatedAt: now,
          verifiedByAdmin: staffUserId,
          verificationStatus: 'VERIFIED',
          remarks: remarks || notes || 'Incoming donation checked in by blood bank staff',
        },
      ],
      { session }
    );
    donationDoc = createdDonation;

    // 2. Update Donor Profile eligibility & history
    if (donorProfile) {
      donorProfile.lastDonationDate = now;
      donorProfile.nextEligibleDate = nextEligibleDate;
      donorProfile.isAvailable = false;
      donorProfile.totalDonations = (donorProfile.totalDonations || 0) + unitsCount;
      await donorProfile.save({ session });
    }

    // 3. Increment Inventory & add batch
    let inv = await BloodInventory.findOne({ bloodBank: bloodBankId, bloodGroup: finalBloodGroup }, null, {
      session,
    });

    if (!inv) {
      const [newInv] = await BloodInventory.create(
        [
          {
            bloodBank: bloodBankId,
            bloodGroup: finalBloodGroup,
            available: unitsCount,
            unitsAvailable: unitsCount,
            unitsTotalCollected: unitsCount,
            totalCollectedUnits: unitsCount,
            batches: [
              {
                unitId: `UNIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
                donor: donorId,
                bloodGroup: finalBloodGroup,
                collectedDate: now,
                expiryDate,
                status: 'AVAILABLE',
              },
            ],
          },
        ],
        { session }
      );
      inv = newInv;
    } else {
      inv.available = (inv.available || 0) + unitsCount;
      inv.unitsAvailable = (inv.unitsAvailable || 0) + unitsCount;
      inv.unitsTotalCollected = (inv.unitsTotalCollected || 0) + unitsCount;
      inv.totalCollectedUnits = (inv.totalCollectedUnits || 0) + unitsCount;
      inv.lastUpdated = now;

      if (!inv.batches) inv.batches = [];
      inv.batches.push({
        unitId: `UNIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
        donor: donorId,
        bloodGroup: finalBloodGroup,
        collectedDate: now,
        expiryDate,
        status: 'AVAILABLE',
      });

      await inv.save({ session });
    }
    inventoryDoc = inv;

    // 4. Update appointment if linked
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        {
          status: 'COMPLETED',
          donation: donationDoc._id,
          unitsDonated: unitsCount,
        },
        { session }
      );
    }

    // 5. Stock audit log
    await InventoryStockLog.create(
      [
        {
          bloodBank: bloodBankId,
          bloodGroup: finalBloodGroup,
          changeType: 'ADD',
          units: unitsCount,
          unitsChanged: unitsCount,
          balanceAfter: inv.available,
          performedBy: staffUserId,
          referenceType: 'DONATION',
          referenceId: donationDoc._id,
          reason: `Incoming donation from donor ${donorUser.name}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (transErr) {
    await session.abortTransaction().catch(() => {});

    // Graceful fallback for standalone MongoDB
    if (
      transErr.message &&
      (transErr.message.includes('replica set') ||
        transErr.message.includes('Transaction numbers are only allowed'))
    ) {
      donationDoc = await Donation.create({
        donor: donorId,
        appointment: appointmentId || null,
        bloodBank: bloodBankId,
        bloodGroup: finalBloodGroup,
        units: unitsCount,
        donatedAt: now,
        verifiedByAdmin: staffUserId,
        verificationStatus: 'VERIFIED',
        remarks: remarks || notes || 'Incoming donation checked in by blood bank staff',
      });

      if (donorProfile) {
        donorProfile.lastDonationDate = now;
        donorProfile.nextEligibleDate = nextEligibleDate;
        donorProfile.isAvailable = false;
        donorProfile.totalDonations = (donorProfile.totalDonations || 0) + unitsCount;
        await donorProfile.save();
      }

      let inv = await BloodInventory.findOne({ bloodBank: bloodBankId, bloodGroup: finalBloodGroup });
      if (!inv) {
        inv = await BloodInventory.create({
          bloodBank: bloodBankId,
          bloodGroup: finalBloodGroup,
          available: unitsCount,
          unitsAvailable: unitsCount,
          unitsTotalCollected: unitsCount,
          totalCollectedUnits: unitsCount,
        });
      } else {
        inv.available = (inv.available || 0) + unitsCount;
        inv.unitsAvailable = (inv.unitsAvailable || 0) + unitsCount;
        await inv.save();
      }
      inventoryDoc = inv;

      if (appointmentId) {
        await Appointment.findByIdAndUpdate(appointmentId, {
          status: 'COMPLETED',
          donation: donationDoc._id,
          unitsDonated: unitsCount,
        });
      }
    } else {
      throw transErr;
    }
  } finally {
    session.endSession();
  }

  // Notify donor via universal notification service
  try {
    await notify({
      userId: donorId,
      type: 'DONATION_RECORDED',
      title: 'Blood Donation Successfully Recorded! 🩸',
      message: `Thank you for donating ${unitsCount} unit(s) of ${finalBloodGroup}. Your donation has been safely accessioned into the blood bank inventory.`,
      channels: ['IN_APP', 'EMAIL'],
      meta: {
        donationId: donationDoc._id,
        bloodGroup: finalBloodGroup,
        units: unitsCount,
        bloodBankId,
        nextEligibleDate: nextEligibleDate.toISOString().split('T')[0],
      },
    });
  } catch (notifErr) {
    console.warn('[BloodBankService] Donation notification error:', notifErr.message);
  }

  return {
    donation: donationDoc,
    inventory: inventoryDoc,
  };
};

/**
 * Record issued units linked to an approved/fulfilled blood request.
 * Decrements stock in a transaction and prevents negative stock.
 *
 * @param {string} bloodBankId
 * @param {Object} issueData
 * @param {string} staffUserId
 */
export const recordIssuedUnits = async (bloodBankId, issueData = {}, staffUserId = null) => {
  const { requestId, bloodGroup, units = 1, issuedTo, remarks, notes } = issueData;

  if (!requestId) {
    const err = new Error('requestId is required to issue blood units.');
    err.statusCode = 400;
    throw err;
  }

  const bloodRequest = await BloodRequest.findById(requestId);
  if (!bloodRequest) {
    const err = new Error('Blood request not found.');
    err.statusCode = 404;
    throw err;
  }

  // Allow issue for APPROVED, DONOR_ASSIGNED, IN_PROGRESS, or FULFILLED
  const allowedStatuses = ['APPROVED', 'DONOR_ASSIGNED', 'IN_PROGRESS', 'FULFILLED'];
  if (!allowedStatuses.includes(bloodRequest.status)) {
    const err = new Error(
      `Cannot issue units for request in '${bloodRequest.status}' status. Request must be APPROVED or in progress.`
    );
    err.statusCode = 400;
    throw err;
  }

  const finalGroup = (bloodGroup || bloodRequest.bloodGroup).toUpperCase();
  const unitsCount = Math.max(1, Number(units) || 1);

  const session = await mongoose.startSession();
  let issueDoc = null;
  let inventoryDoc = null;

  try {
    session.startTransaction();

    const inv = await BloodInventory.findOne({ bloodBank: bloodBankId, bloodGroup: finalGroup }, null, {
      session,
    });

    const currentAvailable = inv ? inv.available ?? inv.unitsAvailable ?? 0 : 0;
    if (currentAvailable < unitsCount) {
      const err = new Error(
        `Insufficient available stock for ${finalGroup}. Available: ${currentAvailable}, Requested to issue: ${unitsCount}. Stock cannot be negative.`
      );
      err.statusCode = 400;
      throw err;
    }

    // Decrement stock
    inv.available = currentAvailable - unitsCount;
    inv.unitsAvailable = currentAvailable - unitsCount;
    inv.lastUpdated = new Date();

    // Mark oldest available batches as ISSUED
    let remainingToMark = unitsCount;
    if (inv.batches && inv.batches.length > 0) {
      for (const batch of inv.batches) {
        if (batch.status === 'AVAILABLE' && remainingToMark > 0) {
          batch.status = 'ISSUED';
          remainingToMark--;
        }
      }
    }

    await inv.save({ session });
    inventoryDoc = inv;

    // Create BloodIssue Record
    const [createdIssue] = await BloodIssue.create(
      [
        {
          bloodBank: bloodBankId,
          request: requestId,
          bloodGroup: finalGroup,
          units: unitsCount,
          issuedAt: new Date(),
          issuedToPatient: issuedTo || bloodRequest.patientName || '',
          issuedBy: staffUserId,
          remarks: remarks || notes || `Issued ${unitsCount} units against request ${requestId}`,
        },
      ],
      { session }
    );
    issueDoc = createdIssue;

    // Update BloodRequest status to FULFILLED if not yet fulfilled
    if (bloodRequest.status !== 'FULFILLED') {
      bloodRequest.status = 'FULFILLED';
      bloodRequest.statusHistory.push({
        status: 'FULFILLED',
        changedBy: staffUserId,
        note: `Blood bank issued ${unitsCount} unit(s) of ${finalGroup}.`,
        changedAt: new Date(),
      });
      await bloodRequest.save({ session });
    }

    // Stock audit log
    await InventoryStockLog.create(
      [
        {
          bloodBank: bloodBankId,
          bloodGroup: finalGroup,
          changeType: 'ISSUE',
          units: unitsCount,
          unitsChanged: -unitsCount,
          balanceAfter: inv.available,
          performedBy: staffUserId,
          referenceType: 'REQUEST',
          referenceId: requestId,
          reason: `Issued for patient ${bloodRequest.patientName} (Request ${requestId})`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (transErr) {
    await session.abortTransaction().catch(() => {});

    // Graceful fallback for standalone MongoDB
    if (
      transErr.message &&
      (transErr.message.includes('replica set') ||
        transErr.message.includes('Transaction numbers are only allowed'))
    ) {
      const inv = await BloodInventory.findOne({ bloodBank: bloodBankId, bloodGroup: finalGroup });
      const currentAvailable = inv ? inv.available ?? inv.unitsAvailable ?? 0 : 0;
      if (currentAvailable < unitsCount) {
        const err = new Error(
          `Insufficient available stock for ${finalGroup}. Available: ${currentAvailable}, Requested to issue: ${unitsCount}. Stock cannot be negative.`
        );
        err.statusCode = 400;
        throw err;
      }

      inv.available = currentAvailable - unitsCount;
      inv.unitsAvailable = currentAvailable - unitsCount;
      await inv.save();
      inventoryDoc = inv;

      issueDoc = await BloodIssue.create({
        bloodBank: bloodBankId,
        request: requestId,
        bloodGroup: finalGroup,
        units: unitsCount,
        issuedAt: new Date(),
        issuedToPatient: issuedTo || bloodRequest.patientName || '',
        issuedBy: staffUserId,
        remarks: remarks || notes || `Issued ${unitsCount} units against request ${requestId}`,
      });

      if (bloodRequest.status !== 'FULFILLED') {
        bloodRequest.status = 'FULFILLED';
        bloodRequest.statusHistory.push({
          status: 'FULFILLED',
          changedBy: staffUserId,
          note: `Blood bank issued ${unitsCount} unit(s) of ${finalGroup}.`,
          changedAt: new Date(),
        });
        await bloodRequest.save();
      }
    } else {
      throw transErr;
    }
  } finally {
    session.endSession();
  }

  // Notify requester via universal notification service
  try {
    await notify({
      userId: bloodRequest.requester,
      type: 'REQUEST_FULFILLED',
      title: 'Blood Units Successfully Issued! 💉',
      message: `${unitsCount} unit(s) of ${finalGroup} have been officially issued from the blood bank for patient ${bloodRequest.patientName || ''}.`,
      channels: ['IN_APP', 'EMAIL'],
      meta: {
        requestId,
        issueId: issueDoc._id,
        bloodGroup: finalGroup,
        units: unitsCount,
        bloodBankId,
      },
    });
  } catch (notifErr) {
    console.warn('[BloodBankService] Issue notification error:', notifErr.message);
  }

  return {
    issue: issueDoc,
    inventory: inventoryDoc,
  };
};

/**
 * Retrieve combined paginated history of incoming donations and issued units for a blood bank.
 *
 * @param {string} bloodBankId
 * @param {Object} queryParams
 */
export const getBloodBankHistory = async (bloodBankId, queryParams = {}) => {
  const { type = 'ALL', page = 1, limit = 20 } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  let donations = [];
  let issues = [];

  const shouldFetchDonations = type === 'ALL' || type === 'DONATION';
  const shouldFetchIssues = type === 'ALL' || type === 'ISSUE';

  const [donationsList, issuesList] = await Promise.all([
    shouldFetchDonations
      ? Donation.find({ bloodBank: bloodBankId })
          .populate('donor', 'name email phone bloodGroup')
          .sort({ donatedAt: -1 })
          .limit(limitNum * 2)
          .lean()
      : [],
    shouldFetchIssues
      ? BloodIssue.find({ bloodBank: bloodBankId })
          .populate('request', 'patientName hospitalName bloodGroup units urgency')
          .sort({ issuedAt: -1 })
          .limit(limitNum * 2)
          .lean()
      : [],
  ]);

  // Normalize into standard unified timeline items
  const unified = [];

  donationsList.forEach((d) => {
    unified.push({
      _id: d._id,
      id: d._id,
      type: 'DONATION',
      direction: 'INCOMING',
      bloodGroup: d.bloodGroup,
      units: d.units,
      date: d.donatedAt || d.createdAt,
      donor: d.donor ? { name: d.donor.name, phone: d.donor.phone, email: d.donor.email } : null,
      appointmentId: d.appointment,
      remarks: d.remarks || 'Voluntary donation',
    });
  });

  issuesList.forEach((i) => {
    unified.push({
      _id: i._id,
      id: i._id,
      type: 'ISSUE',
      direction: 'OUTGOING',
      bloodGroup: i.bloodGroup,
      units: i.units,
      date: i.issuedAt || i.createdAt,
      patientName: i.issuedToPatient || i.request?.patientName,
      requestId: i.request?._id || i.request,
      remarks: i.remarks || 'Issued for clinical transfusion',
    });
  });

  // Sort unified list by date descending
  unified.sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = unified.length;
  const skip = (pageNum - 1) * limitNum;
  const paginatedItems = unified.slice(skip, skip + limitNum);

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    history: paginatedItems,
  };
};
