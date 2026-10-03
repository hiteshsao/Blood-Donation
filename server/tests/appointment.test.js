/**
 * Voluntary Blood Donation Appointments API Tests (/api/v1/appointments)
 *
 * Test Scenarios:
 * 1. GET /slots?bloodBankId=&date=
 *    - Returns available slots with capacity calculation
 *    - Validates missing bloodBankId and invalid dates
 * 2. POST / (Book Appointment)
 *    - Successfully schedules appointment for eligible donor
 *    - Rejects appointment booking if donor is ineligible (e.g. weight < 50kg or under age)
 *    - Prevents double-booking: rejects if donor already has an active booking on that date
 *    - Enforces slot capacity limit (rejects when max bookings exceeded)
 * 3. PUT /:id/reschedule
 *    - Successfully reschedules appointment and updates slotDate/slotTime
 *    - Rejects rescheduling if target slot has conflict
 * 4. PUT /:id/cancel
 *    - Cancels active appointment with reason
 * 5. GET /my
 *    - Returns paginated list of donor's appointments
 * 6. For BLOOD_BANK: GET /bank
 *    - Authorizes BLOOD_BANK role and returns facility appointments
 * 7. For BLOOD_BANK: PUT /:id/complete
 *    - Atomically creates Donation record
 *    - Updates donor's lastDonationDate & nextEligibleDate (90 days male, 120 days female)
 *    - Increments BloodInventory available units in a Mongo transaction
 *    - Marks appointment COMPLETED
 * 8. For BLOOD_BANK: PUT /:id/no-show
 *    - Marks appointment as NO_SHOW
 * 9. Reminder Job (24h before appointment)
 *    - Sweeps upcoming appointments within 24h window and marks reminderSent: true
 */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  BloodBank,
  Appointment,
  Donation,
  DonorProfile,
  BloodInventory,
  EligibilityRule,
} from '../src/models/index.js';
import appointmentRoutes from '../src/routes/appointment.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { sendAppointmentReminders } from '../src/services/appointment.service.js';

// Setup Test App
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/appointments', appointmentRoutes);
app.use((err, req, res, next) => {
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(status).json({ success: false, message: err.message, eligibility: err.eligibility });
});

jest.setTimeout(60000);

let mongoServer;
let request;

let eligibleDonorUser;
let eligibleDonorToken;
let eligibleDonorProfile;

let ineligibleDonorUser;
let ineligibleDonorToken;
let ineligibleDonorProfile;

let nonDonorUser;
let nonDonorToken;

let unverifiedDonorUser;
let unverifiedDonorToken;
let unverifiedDonorProfile;

let cooldownDonorUser;
let cooldownDonorToken;
let cooldownDonorProfile;

let bankUser;
let bankToken;
let testBloodBank;

let adminUser;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // 1. National Eligibility Rule
  await EligibilityRule.create({
    ruleName: 'National Blood Transfusion Criteria',
    minAge: 18,
    maxAge: 65,
    minWeightKg: 50,
    minMaleGapDays: 90,
    minFemaleGapDays: 120,
    minHemoglobin: 12.5,
    isActive: true,
    isDefault: true,
  });

  // 2. Eligible Male Donor (Age: 28, Weight: 68kg, Blood: O+)
  eligibleDonorUser = await User.create({
    name: 'Eligible Donor John',
    email: 'john.donor@test.com',
    phone: '9876543101',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    isDonor: true,
    status: 'ACTIVE',
    isEmailVerified: true,
    dob: new Date('1998-05-15'),
    gender: 'MALE',
    bloodGroup: 'O+',
    city: 'Raigarh',
  });
  eligibleDonorToken = generateTokens(eligibleDonorUser).accessToken;

  eligibleDonorProfile = await DonorProfile.create({
    user: eligibleDonorUser._id,
    bloodGroup: 'O+',
    weight: 68,
    dob: eligibleDonorUser.dob,
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isVerified: true,
    totalDonations: 2,
    nextEligibleDate: new Date(Date.now() - 5 * 86400000), // eligible now
  });

  // 3. Ineligible Donor (Underweight: 42kg)
  ineligibleDonorUser = await User.create({
    name: 'Underweight Donor Jane',
    email: 'jane.underweight@test.com',
    phone: '9876543102',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    isDonor: true,
    status: 'ACTIVE',
    isEmailVerified: true,
    dob: new Date('2000-01-01'),
    gender: 'FEMALE',
    bloodGroup: 'A+',
    city: 'Raigarh',
  });
  ineligibleDonorToken = generateTokens(ineligibleDonorUser).accessToken;

  ineligibleDonorProfile = await DonorProfile.create({
    user: ineligibleDonorUser._id,
    bloodGroup: 'A+',
    weight: 42, // Under 50kg requirement!
    dob: ineligibleDonorUser.dob,
    isAvailable: true,
    verificationStatus: 'VERIFIED',
    isVerified: true,
  });

  // 4. Non-Donor User (role: USER, isDonor: false, no DonorProfile)
  nonDonorUser = await User.create({
    name: 'Standard User Non Donor',
    email: 'standard.user@test.com',
    phone: '9876543105',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    isDonor: false,
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  nonDonorToken = generateTokens(nonDonorUser).accessToken;

  // 5. Unverified Donor User (DonorProfile verificationStatus: 'PENDING')
  unverifiedDonorUser = await User.create({
    name: 'Pending Donor Peter',
    email: 'peter.pending@test.com',
    phone: '9876543106',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    isDonor: true,
    status: 'ACTIVE',
    isEmailVerified: true,
    dob: new Date('1996-03-20'),
    gender: 'MALE',
    bloodGroup: 'B+',
  });
  unverifiedDonorToken = generateTokens(unverifiedDonorUser).accessToken;

  unverifiedDonorProfile = await DonorProfile.create({
    user: unverifiedDonorUser._id,
    bloodGroup: 'B+',
    weight: 65,
    dob: unverifiedDonorUser.dob,
    isAvailable: true,
    verificationStatus: 'PENDING',
    isVerified: false,
  });

  // 6. Donor with Active Cooldown (Donated 10 days ago, 90-day cooldown not elapsed)
  cooldownDonorUser = await User.create({
    name: 'Cooldown Donor Chris',
    email: 'chris.cooldown@test.com',
    phone: '9876543107',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    isDonor: true,
    status: 'ACTIVE',
    isEmailVerified: true,
    dob: new Date('1994-07-10'),
    gender: 'MALE',
    bloodGroup: 'O+',
  });
  cooldownDonorToken = generateTokens(cooldownDonorUser).accessToken;

  const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
  const eligibleDate = new Date(tenDaysAgo.getTime() + 90 * 86400000); // 80 days in future

  cooldownDonorProfile = await DonorProfile.create({
    user: cooldownDonorUser._id,
    bloodGroup: 'O+',
    weight: 70,
    dob: cooldownDonorUser.dob,
    isAvailable: false,
    verificationStatus: 'VERIFIED',
    isVerified: true,
    lastDonationDate: tenDaysAgo,
    nextEligibleDate: eligibleDate,
  });

  // Record past donation for cooldownDonorUser
  await Donation.create({
    donor: cooldownDonorUser._id,
    bloodGroup: 'O+',
    units: 1,
    donatedAt: tenDaysAgo,
    verificationStatus: 'VERIFIED',
  });

  // 7. Blood Bank User and Facility
  bankUser = await User.create({
    name: 'Raigarh Blood Bank Officer',
    email: 'bank.officer@test.com',
    phone: '9876543103',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'ACTIVE',
    isEmailVerified: true,
    city: 'Raigarh',
  });
  bankToken = generateTokens(bankUser).accessToken;

  testBloodBank = await BloodBank.create({
    user: bankUser._id,
    createdBy: bankUser._id,
    name: 'Raigarh District Blood Center',
    city: 'Raigarh',
    state: 'Chhattisgarh',
    pincode: '496001',
    phone: '07762-224400',
    email: 'district.bloodbank@raigarh.gov.in',
    verificationStatus: 'VERIFIED',
    isVerified: true,
    operatingHours: '09:00 AM - 05:00 PM',
  });

  // Initialize Blood Bank Inventory for O+ with 10 initial units
  await BloodInventory.create({
    bloodBank: testBloodBank._id,
    bloodGroup: 'O+',
    available: 10,
    unitsAvailable: 10,
    unitsTotalCollected: 25,
  });

  // 5. Admin User
  adminUser = await User.create({
    name: 'State Transfusion Admin',
    email: 'transfusion.admin@state.gov.in',
    phone: '9876543104',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  adminToken = generateTokens(adminUser).accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('1. GET /api/v1/appointments/slots', () => {
  it('should return available slots with capacity calculation', async () => {
    const res = await request
      .get('/api/v1/appointments/slots')
      .query({
        bloodBankId: testBloodBank._id.toString(),
        date: '2026-10-10',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slots).toBeDefined();
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    expect(res.body.data.slots[0]).toHaveProperty('slotTime');
    expect(res.body.data.slots[0].isAvailable).toBe(true);
    expect(res.body.data.slots[0].bookedCount).toBe(0);
    expect(res.body.data.slots[0].availableCount).toBe(5);
  });

  it('should return 400 when required query parameters are missing', async () => {
    const res = await request.get('/api/v1/appointments/slots');
    expect(res.status).toBe(400);
  });

  it('should return 404 when bloodBank does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request
      .get('/api/v1/appointments/slots')
      .query({ bloodBankId: fakeId, date: '2026-10-10' });
    expect(res.status).toBe(404);
  });
});

describe('2. POST /api/v1/appointments (Booking & Eligibility Rules)', () => {
  let createdAppointmentId;

  it('should allow an eligible donor to book an appointment', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${eligibleDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: '2026-10-10',
        slotTime: '10:00 AM - 11:00 AM',
        notes: 'Regular donor appointment',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment).toBeDefined();
    expect(res.body.appointment.status).toBe('BOOKED');
    expect(res.body.appointment.slotTime).toBe('10:00 AM - 11:00 AM');
    createdAppointmentId = res.body.appointment._id;
  });

  it('should reject booking if donor is ineligible (weight < 50kg)', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${ineligibleDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: '2026-10-12',
        slotTime: '11:00 AM - 12:00 PM',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not currently eligible|Weight 42 kg is below minimum/i);
  });

  it('should prevent double-booking: reject if donor already has an active appointment on that date', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${eligibleDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: '2026-10-10', // Same date as existing appointment!
        slotTime: '02:00 PM - 03:00 PM',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already have an active appointment scheduled on this date/i);
  });

  it('should reject booking if user is not a donor (403 with clear message)', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${nonDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: '2026-10-12',
        slotTime: '11:00 AM - 12:00 PM',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Please become a donor first');
  });

  it('should reject booking if donor profile is not verified yet (403 with clear message)', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${unverifiedDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: '2026-10-12',
        slotTime: '11:00 AM - 12:00 PM',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Your donor profile is not verified yet');
  });

  it('should reject booking if donor cooldown interval has not elapsed (400 with clear message including nextEligibleDate)', async () => {
    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${cooldownDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: '2026-10-12',
        slotTime: '11:00 AM - 12:00 PM',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/You are not eligible until/i);
  });

  it('should reject booking when time slot capacity is completely full (400)', async () => {
    const fullDate = '2026-10-30';
    const fullSlotTime = '04:00 PM - 05:00 PM';

    // Seed 5 existing appointments for this slot
    for (let i = 0; i < 5; i++) {
      const dummyUser = await User.create({
        name: `Dummy Donor ${i}`,
        email: `dummy${i}@test.com`,
        phone: `987654329${i}`,
        password: 'Password@123',
        passwordHash: 'Password@123',
        role: 'USER',
        isDonor: true,
        status: 'ACTIVE',
        isEmailVerified: true,
      });
      await Appointment.create({
        donor: dummyUser._id,
        bloodBank: testBloodBank._id,
        slotDate: new Date(fullDate),
        slotTime: fullSlotTime,
        status: 'BOOKED',
      });
    }

    const res = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${eligibleDonorToken}`)
      .send({
        bloodBankId: testBloodBank._id.toString(),
        slotDate: fullDate,
        slotTime: fullSlotTime,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/fully booked/i);
  });

  it('should accurately reflect booked count in /slots after booking', async () => {
    const res = await request
      .get('/api/v1/appointments/slots')
      .query({
        bloodBankId: testBloodBank._id.toString(),
        date: '2026-10-10',
      });

    expect(res.status).toBe(200);
    const slot = res.body.data.slots.find((s) => s.slotTime === '10:00 AM - 11:00 AM');
    expect(slot).toBeDefined();
    expect(slot.bookedCount).toBe(1);
    expect(slot.availableCount).toBe(4);
  });

  it('should exclude CANCELLED appointments when calculating slot availability and remaining capacity', async () => {
    const cancelTestDate = '2026-11-05';
    const cancelTestSlot = '09:00 AM - 10:00 AM';

    // 1. Create a booked appointment
    const dummyUser = await User.create({
      name: 'Cancel Test Donor',
      email: 'cancel.donor@test.com',
      phone: '9876543999',
      password: 'Password@123',
      passwordHash: 'Password@123',
      role: 'USER',
      isDonor: true,
      status: 'ACTIVE',
      isEmailVerified: true,
    });
    const appt = await Appointment.create({
      donor: dummyUser._id,
      bloodBank: testBloodBank._id,
      slotDate: new Date(cancelTestDate),
      slotTime: cancelTestSlot,
      status: 'BOOKED',
    });

    // Check slots: bookedCount should be 1
    let slotsRes = await request
      .get('/api/v1/appointments/slots')
      .query({ bloodBankId: testBloodBank._id.toString(), date: cancelTestDate });
    let slotData = slotsRes.body.data.slots.find((s) => s.slotTime === cancelTestSlot);
    expect(slotData.bookedCount).toBe(1);
    expect(slotData.availableCount).toBe(4);

    // 2. Mark appointment as CANCELLED
    appt.status = 'CANCELLED';
    await appt.save();

    // Check slots again: bookedCount should be 0, availableCount should be 5
    slotsRes = await request
      .get('/api/v1/appointments/slots')
      .query({ bloodBankId: testBloodBank._id.toString(), date: cancelTestDate });
    slotData = slotsRes.body.data.slots.find((s) => s.slotTime === cancelTestSlot);
    expect(slotData.bookedCount).toBe(0);
    expect(slotData.availableCount).toBe(5);
  });
});

describe('3. PUT /api/v1/appointments/:id/reschedule', () => {
  let apptId;

  beforeAll(async () => {
    // Create an appointment for rescheduling test
    const appt = await Appointment.create({
      donor: eligibleDonorUser._id,
      bloodBank: testBloodBank._id,
      slotDate: new Date('2026-10-15'),
      slotTime: '09:00 AM - 10:00 AM',
      status: 'BOOKED',
    });
    apptId = appt._id.toString();
  });

  it('should allow donor to reschedule an appointment', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptId}/reschedule`)
      .set('Authorization', `Bearer ${eligibleDonorToken}`)
      .send({
        slotDate: '2026-10-16',
        slotTime: '02:00 PM - 03:00 PM',
        reason: 'Work conference rescheduled',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('RESCHEDULED');
    expect(res.body.appointment.slotTime).toBe('02:00 PM - 03:00 PM');
  });

  it('should reject reschedule by unauthorized third-party user', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptId}/reschedule`)
      .set('Authorization', `Bearer ${ineligibleDonorToken}`)
      .send({
        slotDate: '2026-10-17',
        slotTime: '03:00 PM - 04:00 PM',
      });

    expect(res.status).toBe(403);
  });
});

describe('4. PUT /api/v1/appointments/:id/cancel', () => {
  let apptId;

  beforeAll(async () => {
    const appt = await Appointment.create({
      donor: eligibleDonorUser._id,
      bloodBank: testBloodBank._id,
      slotDate: new Date('2026-10-20'),
      slotTime: '11:00 AM - 12:00 PM',
      status: 'BOOKED',
    });
    apptId = appt._id.toString();
  });

  it('should allow donor to cancel their appointment', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptId}/cancel`)
      .set('Authorization', `Bearer ${eligibleDonorToken}`)
      .send({
        cancellationReason: 'Traveling out of station',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('CANCELLED');
    expect(res.body.appointment.cancellationReason).toBe('Traveling out of station');
  });

  it('should reject cancelling an already cancelled appointment', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptId}/cancel`)
      .set('Authorization', `Bearer ${eligibleDonorToken}`)
      .send({ cancellationReason: 'Again' });

    expect(res.status).toBe(400);
  });
});

describe('5. GET /api/v1/appointments/my', () => {
  it('should return donor appointments list with pagination', async () => {
    const res = await request
      .get('/api/v1/appointments/my')
      .set('Authorization', `Bearer ${eligibleDonorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.appointments)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });
});

describe('6. For BLOOD_BANK: GET /api/v1/appointments/bank', () => {
  it('should allow blood bank to fetch its appointments', async () => {
    const res = await request
      .get('/api/v1/appointments/bank')
      .set('Authorization', `Bearer ${bankToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bloodBank).toBeDefined();
    expect(Array.isArray(res.body.appointments)).toBe(true);
  });

  it('should reject non-blood bank roles from accessing /bank', async () => {
    const res = await request
      .get('/api/v1/appointments/bank')
      .set('Authorization', `Bearer ${eligibleDonorToken}`);

    expect(res.status).toBe(403);
  });
});

describe('7. For BLOOD_BANK: PUT /api/v1/appointments/:id/complete', () => {
  let apptToComplete;
  let initialStock;

  beforeAll(async () => {
    const appt = await Appointment.create({
      donor: eligibleDonorUser._id,
      bloodBank: testBloodBank._id,
      slotDate: new Date('2026-10-25'),
      slotTime: '10:00 AM - 11:00 AM',
      status: 'BOOKED',
    });
    apptToComplete = appt._id.toString();

    const inv = await BloodInventory.findOne({
      bloodBank: testBloodBank._id,
      bloodGroup: 'O+',
    });
    initialStock = inv.available;
  });

  it('should complete appointment, create donation, update donor eligibility, and increment inventory in a transaction', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptToComplete}/complete`)
      .set('Authorization', `Bearer ${bankToken}`)
      .send({
        units: 1,
        remarks: 'Successful voluntary donation',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('COMPLETED');
    expect(res.body.donation).toBeDefined();
    expect(res.body.donation.units).toBe(1);
    expect(res.body.donation.bloodGroup).toBe('O+');

    // Verify DonorProfile updated
    const updatedProfile = await DonorProfile.findOne({ user: eligibleDonorUser._id });
    expect(updatedProfile.isAvailable).toBe(false);
    expect(updatedProfile.lastDonationDate).toBeDefined();
    expect(new Date(updatedProfile.nextEligibleDate).getTime()).toBeGreaterThan(Date.now());
    expect(updatedProfile.totalDonations).toBe(3); // 2 initial + 1

    // Verify BloodInventory incremented
    const updatedInv = await BloodInventory.findOne({
      bloodBank: testBloodBank._id,
      bloodGroup: 'O+',
    });
    expect(updatedInv.available).toBe(initialStock + 1);
    expect(updatedInv.unitsAvailable).toBe(initialStock + 1);
  });

  it('should reject completing an already completed appointment', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptToComplete}/complete`)
      .set('Authorization', `Bearer ${bankToken}`)
      .send({ units: 1 });

    expect(res.status).toBe(400);
  });
});

describe('8. For BLOOD_BANK: PUT /api/v1/appointments/:id/no-show', () => {
  let apptNoShow;

  beforeAll(async () => {
    const appt = await Appointment.create({
      donor: eligibleDonorUser._id,
      bloodBank: testBloodBank._id,
      slotDate: new Date('2026-10-28'),
      slotTime: '03:00 PM - 04:00 PM',
      status: 'BOOKED',
    });
    apptNoShow = appt._id.toString();
  });

  it('should mark appointment as NO_SHOW', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apptNoShow}/no-show`)
      .set('Authorization', `Bearer ${bankToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('NO_SHOW');
  });
});

describe('9. 24-Hour Appointment Reminder Job', () => {
  beforeAll(async () => {
    // Create an upcoming appointment within the next 12 hours (well within 24h window)
    const in12Hours = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await Appointment.create({
      donor: eligibleDonorUser._id,
      bloodBank: testBloodBank._id,
      slotDate: in12Hours,
      slotTime: '11:00 AM - 12:00 PM',
      status: 'BOOKED',
      reminderSent: false,
    });
  });

  it('should find upcoming appointments within 24h and mark reminderSent: true', async () => {
    const result = await sendAppointmentReminders();

    expect(result).toBeDefined();
    expect(result.remindedCount).toBeGreaterThan(0);
    expect(result.remindedIds.length).toBeGreaterThan(0);

    // Verify reminderSent is now true in DB
    const checkedAppt = await Appointment.findById(result.remindedIds[0]);
    expect(checkedAppt.reminderSent).toBe(true);

    // Running again should not re-send to already reminded appointments
    const secondRun = await sendAppointmentReminders();
    expect(secondRun.remindedCount).toBe(0);
  });
});
