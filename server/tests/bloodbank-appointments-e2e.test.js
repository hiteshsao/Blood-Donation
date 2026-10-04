/**
 * End-to-End Verification Test for Blood Bank Appointments Scoping & Operations
 *
 * Requirements Verified:
 * 1. Create test data: at least 3 different donors booking appointments at the SAME blood bank,
 *    and 1 donor booking at a DIFFERENT blood bank.
 * 2. Log in as that blood bank - confirm all 3 relevant appointments show, and the appointment
 *    at the different blood bank does NOT show.
 * 3. Log in as a donor - confirm they still only see their own appointment(s), with no Complete/No-show
 *    buttons or authorization visible/permitted to them.
 * 4. Role guards: verify BLOOD_BANK cannot access donor /my endpoint and USER cannot access /bank.
 * 5. Test "Mark Complete" end-to-end and confirm Donation record + donor eligibility + inventory
 *    all update correctly in the database.
 * 6. Test "Mark No-Show" end-to-end.
 * 7. Multi-tenancy guard: a blood bank cannot complete or mark no-show for another blood bank's appointment.
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

// Blood Bank A
let bankUserA;
let bankTokenA;
let bloodBankA;

// Blood Bank B
let bankUserB;
let bankTokenB;
let bloodBankB;

// 4 Donors
let donor1User, donor1Token, donor1Profile;
let donor2User, donor2Token, donor2Profile;
let donor3User, donor3Token, donor3Profile;
let donor4User, donor4Token, donor4Profile;

// Appointments
let apt1AId;
let apt2AId;
let apt3AId;
let apt4BId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // 1. Eligibility Rule
  await EligibilityRule.create({
    ruleName: 'National Criteria',
    minAge: 18,
    maxAge: 65,
    minWeightKg: 50,
    minMaleGapDays: 90,
    minFemaleGapDays: 120,
    minHemoglobin: 12.5,
    isActive: true,
    isDefault: true,
  });

  // 2. Setup Blood Bank A
  bankUserA = await User.create({
    name: 'Apollo Blood Bank Officer',
    email: 'apollo.bank@test.com',
    phone: '9876543001',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  bankTokenA = generateTokens(bankUserA).accessToken;

  bloodBankA = await BloodBank.create({
    user: bankUserA._id,
    name: 'Apollo City Blood Bank',
    city: 'Mumbai',
    licenseNumber: 'MH-APO-2026',
    contact: { phone: '9876543001', email: 'apollo.bank@test.com' },
  });

  // Initial Inventory for Blood Bank A
  await BloodInventory.create({
    bloodBank: bloodBankA._id,
    bloodGroup: 'O+',
    available: 10,
    unitsAvailable: 10,
    unitsReserved: 0,
    reserved: 0,
    lowStockThreshold: 5,
  });

  // 3. Setup Blood Bank B (Different Facility)
  bankUserB = await User.create({
    name: 'RedCross Center Officer',
    email: 'redcross.bank@test.com',
    phone: '9876543002',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  bankTokenB = generateTokens(bankUserB).accessToken;

  bloodBankB = await BloodBank.create({
    user: bankUserB._id,
    name: 'Red Cross National Blood Center',
    city: 'New Delhi',
    licenseNumber: 'DL-RC-2026',
    contact: { phone: '9876543002', email: 'redcross.bank@test.com' },
  });

  // 4. Setup 4 Eligible Verified Donors
  const createDonor = async (name, email, phone, bloodGroup, gender = 'MALE') => {
    const user = await User.create({
      name,
      email,
      phone,
      password: 'Password@123',
      passwordHash: 'Password@123',
      role: 'USER',
      isDonor: true,
      bloodGroup,
      gender,
      dob: new Date('1995-05-15'),
      status: 'ACTIVE',
      isEmailVerified: true,
    });
    const profile = await DonorProfile.create({
      user: user._id,
      bloodGroup,
      weightKg: 68,
      dob: new Date('1995-05-15'),
      isAvailable: true,
      verificationStatus: 'VERIFIED',
      lastDonationDate: null,
      nextEligibleDate: new Date(Date.now() - 86400000), // eligible now
    });
    const token = generateTokens(user).accessToken;
    return { user, profile, token };
  };

  const d1 = await createDonor('Rahul Sharma', 'rahul@test.com', '9811111111', 'O+', 'MALE');
  donor1User = d1.user;
  donor1Profile = d1.profile;
  donor1Token = d1.token;

  const d2 = await createDonor('Pooja Patel', 'pooja@test.com', '9822222222', 'A+', 'FEMALE');
  donor2User = d2.user;
  donor2Profile = d2.profile;
  donor2Token = d2.token;

  const d3 = await createDonor('Amit Verma', 'amit@test.com', '9833333333', 'B+', 'MALE');
  donor3User = d3.user;
  donor3Profile = d3.profile;
  donor3Token = d3.token;

  const d4 = await createDonor('Kavita Rao', 'kavita@test.com', '9844444444', 'AB+', 'FEMALE');
  donor4User = d4.user;
  donor4Profile = d4.profile;
  donor4Token = d4.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 3 End-to-End Verification: Blood Bank Scoped Appointments', () => {
  it('Step 1: 3 donors book at Blood Bank A, 1 donor books at Blood Bank B', async () => {
    // Donor 1 books at Blood Bank A
    const res1 = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({
        bloodBankId: bloodBankA._id.toString(),
        slotDate: '2026-10-15',
        slotTime: '09:00 AM - 10:00 AM',
        notes: 'Regular donor, O+ whole blood',
      });
    expect(res1.status).toBe(201);
    apt1AId = res1.body.appointment._id;

    // Donor 2 books at Blood Bank A
    const res2 = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${donor2Token}`)
      .send({
        bloodBankId: bloodBankA._id.toString(),
        slotDate: '2026-10-15',
        slotTime: '10:00 AM - 11:00 AM',
        notes: 'First time donor at this center',
      });
    expect(res2.status).toBe(201);
    apt2AId = res2.body.appointment._id;

    // Donor 3 books at Blood Bank A
    const res3 = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${donor3Token}`)
      .send({
        bloodBankId: bloodBankA._id.toString(),
        slotDate: '2026-10-16',
        slotTime: '11:00 AM - 12:00 PM',
        notes: 'Requested hydration advice prior',
      });
    expect(res3.status).toBe(201);
    apt3AId = res3.body.appointment._id;

    // Donor 4 books at Blood Bank B (DIFFERENT BANK)
    const res4 = await request
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${donor4Token}`)
      .send({
        bloodBankId: bloodBankB._id.toString(),
        slotDate: '2026-10-15',
        slotTime: '02:00 PM - 03:00 PM',
        notes: 'Booking at RedCross Center Delhi',
      });
    expect(res4.status).toBe(201);
    apt4BId = res4.body.appointment._id;
  });

  it('Step 2: Blood Bank A fetches appointments - shows all 3 relevant appointments, and NOT the appointment at Blood Bank B', async () => {
    const res = await request
      .get('/api/v1/appointments/bank')
      .set('Authorization', `Bearer ${bankTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bloodBank).toBeDefined();
    expect(res.body.bloodBank.id.toString()).toBe(bloodBankA._id.toString());

    const aptIds = res.body.appointments.map((a) => a._id.toString());

    // Must contain all 3 appointments booked at Bank A
    expect(aptIds).toContain(apt1AId.toString());
    expect(aptIds).toContain(apt2AId.toString());
    expect(aptIds).toContain(apt3AId.toString());

    // Must NOT contain Donor 4's appointment (booked at Bank B)
    expect(aptIds).not.toContain(apt4BId.toString());
    expect(res.body.appointments.length).toBe(3);

    // Verify populated donor details
    const donor1Apt = res.body.appointments.find((a) => a._id.toString() === apt1AId.toString());
    expect(donor1Apt.donor.name).toBe('Rahul Sharma');
    expect(donor1Apt.donor.bloodGroup).toBe('O+');
    expect(donor1Apt.status).toBe('BOOKED');
  });

  it('Step 2b: Blood Bank B fetches appointments - only sees its own appointment (Donor 4)', async () => {
    const res = await request
      .get('/api/v1/appointments/bank')
      .set('Authorization', `Bearer ${bankTokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments.length).toBe(1);
    expect(res.body.appointments[0]._id.toString()).toBe(apt4BId.toString());
    expect(res.body.appointments[0].donor.name).toBe('Kavita Rao');
  });

  it('Step 3: Donor 1 fetches /my - only sees their own appointment(s)', async () => {
    const res = await request
      .get('/api/v1/appointments/my')
      .set('Authorization', `Bearer ${donor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointments.length).toBe(1);
    expect(res.body.appointments[0]._id.toString()).toBe(apt1AId.toString());
    expect(res.body.appointments[0].bloodBank.name).toBe('Apollo City Blood Bank');
  });

  it('Step 3b: Route guards enforce JWT role claims - donor cannot access /bank, bloodbank cannot access /my', async () => {
    // 1. Donor attempting to access /bank -> 403 Forbidden
    const donorToBankRes = await request
      .get('/api/v1/appointments/bank')
      .set('Authorization', `Bearer ${donor1Token}`);
    expect(donorToBankRes.status).toBe(403);
    expect(donorToBankRes.body.success).toBe(false);

    // 2. Blood Bank attempting to access /my -> 403 Forbidden
    const bankToMyRes = await request
      .get('/api/v1/appointments/my')
      .set('Authorization', `Bearer ${bankTokenA}`);
    expect(bankToMyRes.status).toBe(403);
    expect(bankToMyRes.body.success).toBe(false);

    // 3. Donor attempting to execute "complete" -> 403 Forbidden
    const donorCompleteRes = await request
      .put(`/api/v1/appointments/${apt1AId}/complete`)
      .set('Authorization', `Bearer ${donor1Token}`)
      .send({ units: 1 });
    expect(donorCompleteRes.status).toBe(403);

    // 4. Donor attempting to execute "no-show" -> 403 Forbidden
    const donorNoShowRes = await request
      .put(`/api/v1/appointments/${apt1AId}/no-show`)
      .set('Authorization', `Bearer ${donor1Token}`);
    expect(donorNoShowRes.status).toBe(403);
  });

  it('Step 3c: Multi-tenancy guard - Blood Bank A cannot complete or no-show an appointment at Blood Bank B', async () => {
    // Bank A attempts to complete Bank B's appointment -> 403 Forbidden
    const completeCrossRes = await request
      .put(`/api/v1/appointments/${apt4BId}/complete`)
      .set('Authorization', `Bearer ${bankTokenA}`)
      .send({ units: 1 });
    expect(completeCrossRes.status).toBe(403);

    // Bank A attempts to mark no-show on Bank B's appointment -> 403 Forbidden
    const noShowCrossRes = await request
      .put(`/api/v1/appointments/${apt4BId}/no-show`)
      .set('Authorization', `Bearer ${bankTokenA}`);
    expect(noShowCrossRes.status).toBe(403);
  });

  it('Step 4: Blood Bank A marks Complete end-to-end - updates Donation record + donor eligibility + inventory in DB', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apt1AId}/complete`)
      .set('Authorization', `Bearer ${bankTokenA}`)
      .send({
        units: 1,
        bagNo: 'WB-2026-OPOS-1001',
        remarks: 'Successful voluntary donation, donor comfortable',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('COMPLETED');
    expect(res.body.donation).toBeDefined();

    // 1. Verify Donation Record in DB
    const donation = await Donation.findById(res.body.donation._id);
    expect(donation).toBeDefined();
    expect(donation.donor.toString()).toBe(donor1User._id.toString());
    expect(donation.bloodBank.toString()).toBe(bloodBankA._id.toString());
    expect(donation.bloodGroup).toBe('O+');
    expect(donation.units).toBe(1);
    expect(donation.verificationStatus).toBe('VERIFIED');

    // 2. Verify Donor 1 Profile Updated (Eligibility & Dates)
    const updatedProfile = await DonorProfile.findOne({ user: donor1User._id });
    expect(updatedProfile.isAvailable).toBe(false);
    expect(updatedProfile.lastDonationDate).toBeDefined();
    expect(new Date(updatedProfile.nextEligibleDate).getTime()).toBeGreaterThan(Date.now() + 80 * 86400000);
    expect(updatedProfile.totalDonations).toBe(1);

    // 3. Verify Blood Bank A Inventory Incremented (10 -> 11)
    const updatedInventory = await BloodInventory.findOne({
      bloodBank: bloodBankA._id,
      bloodGroup: 'O+',
    });
    expect(updatedInventory.available).toBe(11);
    expect(updatedInventory.unitsAvailable).toBe(11);
  });

  it('Step 5: Blood Bank A marks Donor 2 as No-Show', async () => {
    const res = await request
      .put(`/api/v1/appointments/${apt2AId}/no-show`)
      .set('Authorization', `Bearer ${bankTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('NO_SHOW');

    // Verify appointment status in DB
    const apt = await Appointment.findById(apt2AId);
    expect(apt.status).toBe('NO_SHOW');
  });

  it('Step 6: Status filtering on GET /bank works accurately', async () => {
    // 1. Filter status=COMPLETED -> only Donor 1
    const resCompleted = await request
      .get('/api/v1/appointments/bank')
      .query({ status: 'COMPLETED' })
      .set('Authorization', `Bearer ${bankTokenA}`);
    expect(resCompleted.status).toBe(200);
    expect(resCompleted.body.appointments.length).toBe(1);
    expect(resCompleted.body.appointments[0]._id.toString()).toBe(apt1AId.toString());

    // 2. Filter status=NO_SHOW -> only Donor 2
    const resNoShow = await request
      .get('/api/v1/appointments/bank')
      .query({ status: 'NO_SHOW' })
      .set('Authorization', `Bearer ${bankTokenA}`);
    expect(resNoShow.status).toBe(200);
    expect(resNoShow.body.appointments.length).toBe(1);
    expect(resNoShow.body.appointments[0]._id.toString()).toBe(apt2AId.toString());

    // 3. Filter status=BOOKED -> only Donor 3
    const resBooked = await request
      .get('/api/v1/appointments/bank')
      .query({ status: 'BOOKED' })
      .set('Authorization', `Bearer ${bankTokenA}`);
    expect(resBooked.status).toBe(200);
    expect(resBooked.body.appointments.length).toBe(1);
    expect(resBooked.body.appointments[0]._id.toString()).toBe(apt3AId.toString());
  });
});
