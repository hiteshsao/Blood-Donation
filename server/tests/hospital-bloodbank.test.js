/**
 * Integration Test Suite for Hospital & Blood Bank Modules
 * - Hospital (/api/v1/hospital): GET/PUT profile, license upload, GET requests (own), confirm units received
 * - Blood Bank (/api/v1/bloodbank): GET/PUT profile, GET inventory, PUT inventory/:group, POST donations, POST issue, GET history
 * - Verification Guard: Only VERIFIED hospitals/banks may access
 * - Inventory Rules: reserved vs available vs expired, 35-day whole blood shelf life, daily cron & low-stock alerts
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  Hospital,
  BloodBank,
  BloodInventory,
  BloodRequest,
  Appointment,
  Donation,
  BloodIssue,
  DonorProfile,
  Notification,
} from '../src/models/index.js';

import hospitalRoutes from '../src/routes/hospital.routes.js';
import bloodBankRoutes from '../src/routes/bloodbank.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { initSocket } from '../src/config/socket.js';
import { runDailyExpiryCheck } from '../src/jobs/inventory.cron.js';

let mongoServer;
let app;
let server;
let request;

// Users & Tokens
let verifiedHospUser;
let verifiedHospToken;
let verifiedHospital;

let unverifiedHospUser;
let unverifiedHospToken;
let unverifiedHospital;

let verifiedBankUser;
let verifiedBankToken;
let verifiedBloodBank;

let unverifiedBankUser;
let unverifiedBankToken;
let unverifiedBloodBank;

let donorUser;
let donorToken;
let donorProfile;

let adminUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount routes
  app.use('/api/v1/hospital', hospitalRoutes);
  app.use('/api/v1/bloodbank', bloodBankRoutes);

  // Centralized Error Handling Middleware for tests
  app.use((err, req, res, next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });

  server = http.createServer(app);
  initSocket(server);
  request = supertest(app);

  // 1. Seed Verified Hospital
  verifiedHospUser = await User.create({
    name: 'City Care Hospital Staff',
    email: 'citycare.hospital@test.com',
    phone: '9811111111',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  verifiedHospToken = generateTokens(verifiedHospUser).accessToken;

  verifiedHospital = await Hospital.create({
    user: verifiedHospUser._id,
    name: 'City Care Multi-Speciality Hospital',
    licenseNumber: 'HOSP-LIC-2026-001',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    address: { line: '100 Medical Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    contact: { phone: '9811111111', email: 'citycare.hospital@test.com' },
    verificationStatus: 'VERIFIED',
    isVerified: true,
    location: { type: 'Point', coordinates: [72.8777, 19.076] },
  });

  // 2. Seed Unverified Hospital
  unverifiedHospUser = await User.create({
    name: 'Pending Hospital Staff',
    email: 'pending.hospital@test.com',
    phone: '9811111112',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  unverifiedHospToken = generateTokens(unverifiedHospUser).accessToken;

  unverifiedHospital = await Hospital.create({
    user: unverifiedHospUser._id,
    name: 'Pending Approval Hospital',
    licenseNumber: 'HOSP-LIC-PENDING-002',
    city: 'Mumbai',
    verificationStatus: 'PENDING',
    isVerified: false,
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });

  // 3. Seed Verified Blood Bank
  verifiedBankUser = await User.create({
    name: 'Central Blood Bank Staff',
    email: 'central.bloodbank@test.com',
    phone: '9822222221',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  verifiedBankToken = generateTokens(verifiedBankUser).accessToken;

  verifiedBloodBank = await BloodBank.create({
    user: verifiedBankUser._id,
    name: 'Central Regional Blood Bank',
    licenseNumber: 'BB-LIC-2026-001',
    registrationNumber: 'REG-BB-001',
    operatingHours: '24/7',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400012',
    address: { line: '200 Health Way', city: 'Mumbai', state: 'Maharashtra', pincode: '400012' },
    contact: { phone: '9822222221', email: 'central.bloodbank@test.com' },
    verificationStatus: 'VERIFIED',
    isVerified: true,
    location: { type: 'Point', coordinates: [72.85, 19.02] },
  });

  // 4. Seed Unverified Blood Bank
  unverifiedBankUser = await User.create({
    name: 'Unverified Bank Staff',
    email: 'unverified.bloodbank@test.com',
    phone: '9822222222',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  unverifiedBankToken = generateTokens(unverifiedBankUser).accessToken;

  unverifiedBloodBank = await BloodBank.create({
    user: unverifiedBankUser._id,
    name: 'Pending Approval Blood Bank',
    licenseNumber: 'BB-LIC-PENDING-002',
    city: 'Mumbai',
    verificationStatus: 'PENDING',
    isVerified: false,
    location: { type: 'Point', coordinates: [72.86, 19.03] },
  });

  // 5. Seed Donor User & Profile
  donorUser = await User.create({
    name: 'Rahul Sharma',
    email: 'rahul.donor@test.com',
    phone: '9833333331',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    gender: 'MALE',
    bloodGroup: 'O+',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  donorToken = generateTokens(donorUser).accessToken;

  donorProfile = await DonorProfile.create({
    user: donorUser._id,
    bloodGroup: 'O+',
    isAvailable: true,
    totalDonations: 2,
    verificationStatus: 'VERIFIED',
    isVerified: true,
    location: { type: 'Point', coordinates: [72.87, 19.07] },
  });

  // 6. Seed System Admin
  adminUser = await User.create({
    name: 'Admin System',
    email: 'admin.audit@test.com',
    phone: '9899999999',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
}, 60000);

afterAll(async () => {
  if (server) server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('1. Access Control & Verification Guard', () => {
  it('should reject non-hospital roles from accessing /api/v1/hospital with 403', async () => {
    const res = await request
      .get('/api/v1/hospital/profile')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access restricted to hospital accounts');
  });

  it('should reject unverified hospitals with 403 Forbidden', async () => {
    const res = await request
      .get('/api/v1/hospital/profile')
      .set('Authorization', `Bearer ${unverifiedHospToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('pending verification');
  });

  it('should allow verified hospital to access /api/v1/hospital/profile with 200', async () => {
    const res = await request
      .get('/api/v1/hospital/profile')
      .set('Authorization', `Bearer ${verifiedHospToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hospital.name).toBe('City Care Multi-Speciality Hospital');
  });

  it('should reject non-blood-bank roles from accessing /api/v1/bloodbank with 403', async () => {
    const res = await request
      .get('/api/v1/bloodbank/profile')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access restricted to blood bank accounts');
  });

  it('should reject unverified blood banks with 403 Forbidden', async () => {
    const res = await request
      .get('/api/v1/bloodbank/profile')
      .set('Authorization', `Bearer ${unverifiedBankToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('pending verification');
  });

  it('should allow verified blood bank to access /api/v1/bloodbank/profile with 200', async () => {
    const res = await request
      .get('/api/v1/bloodbank/profile')
      .set('Authorization', `Bearer ${verifiedBankToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bloodBank.name).toBe('Central Regional Blood Bank');
  });
});

describe('2. Hospital Module (/api/v1/hospital)', () => {
  it('PUT /profile: should update hospital profile information', async () => {
    const res = await request
      .put('/api/v1/hospital/profile')
      .set('Authorization', `Bearer ${verifiedHospToken}`)
      .send({
        name: 'City Care Apex Hospital',
        phone: '9811119999',
        bedCapacity: 250,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hospital.name).toBe('City Care Apex Hospital');
    expect(res.body.hospital.phone).toBe('9811119999');
  });

  it('POST /license: should upload hospital license document', async () => {
    const fakeBuffer = Buffer.from('%PDF-1.4 test document content');
    const res = await request
      .post('/api/v1/hospital/license')
      .set('Authorization', `Bearer ${verifiedHospToken}`)
      .attach('license', fakeBuffer, 'hospital_license.pdf')
      .field('licenseNumber', 'HOSP-LIC-NEW-2026');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.licenseDocUrl).toContain('/uploads/documents/license-');
    expect(res.body.hospital.licenseNumber).toBe('HOSP-LIC-NEW-2026');
  });

  it('GET /requests: should retrieve hospital own blood requests', async () => {
    // Seed 2 blood requests for this hospital
    await BloodRequest.create([
      {
        requester: verifiedHospUser._id,
        hospital: verifiedHospital._id,
        hospitalName: verifiedHospital.name,
        patientName: 'ICU Patient Alpha',
        bloodGroup: 'O+',
        units: 2,
        status: 'IN_PROGRESS',
        city: 'Mumbai',
        contactNumber: '9811111111',
      },
      {
        requester: verifiedHospUser._id,
        hospital: verifiedHospital._id,
        hospitalName: verifiedHospital.name,
        patientName: 'Trauma Patient Beta',
        bloodGroup: 'A+',
        units: 1,
        status: 'APPROVED',
        city: 'Mumbai',
        contactNumber: '9811111111',
      },
    ]);

    const res = await request
      .get('/api/v1/hospital/requests?page=1&limit=10')
      .set('Authorization', `Bearer ${verifiedHospToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requests.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('POST /requests/:id/confirm-received: should mark request as FULFILLED and notify requester', async () => {
    const bloodReq = await BloodRequest.create({
      requester: donorUser._id, // donor requested for family
      hospital: verifiedHospital._id,
      hospitalName: verifiedHospital.name,
      patientName: 'Emergency Surgery Patient',
      bloodGroup: 'B+',
      units: 3,
      status: 'IN_PROGRESS',
      city: 'Mumbai',
      contactNumber: '9833333331',
    });

    const res = await request
      .post(`/api/v1/hospital/requests/${bloodReq._id}/confirm-received`)
      .set('Authorization', `Bearer ${verifiedHospToken}`)
      .send({ remarks: 'All 3 units received at hospital blood bank counter' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('FULFILLED');

    const updated = await BloodRequest.findById(bloodReq._id);
    expect(updated.status).toBe('FULFILLED');
    const lastHistory = updated.statusHistory[updated.statusHistory.length - 1];
    expect(lastHistory.status).toBe('FULFILLED');

    // Requester received notification
    const notif = await Notification.findOne({
      user: donorUser._id,
      type: 'REQUEST_FULFILLED',
    });
    expect(notif).not.toBeNull();
    expect(notif.title).toContain('Received by Hospital');
  });
});

describe('3. Blood Bank Module (/api/v1/bloodbank)', () => {
  it('PUT /profile: should update blood bank profile details', async () => {
    const res = await request
      .put('/api/v1/bloodbank/profile')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        operatingHours: '24/7 with Trauma Support',
        phone: '9822229999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bloodBank.operatingHours).toBe('24/7 with Trauma Support');
  });

  it('GET /inventory: should return inventory grid for all 8 blood groups', async () => {
    const res = await request
      .get('/api/v1/bloodbank/inventory')
      .set('Authorization', `Bearer ${verifiedBankToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.inventory.length).toBe(8); // all 8 blood groups
    expect(res.body.totalAvailable).toBeDefined();
    expect(res.body.totalReserved).toBeDefined();
    expect(res.body.totalExpired).toBeDefined();
  });

  it('PUT /inventory/:group (ADD): should increment available stock and record batch', async () => {
    const res = await request
      .put('/api/v1/bloodbank/inventory/O%2B')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        action: 'ADD',
        units: 10,
        reason: 'Received units from mobile donation camp',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bloodGroup).toBe('O+');
    expect(res.body.available).toBeGreaterThanOrEqual(10);
  });

  it('PUT /inventory/:group (REMOVE): should decrement available stock', async () => {
    const res = await request
      .put('/api/v1/bloodbank/inventory/O%2B')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        action: 'REMOVE',
        units: 3,
        reason: 'Laboratory testing sample issue',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /inventory/:group: PREVENT NEGATIVE STOCK - should reject removing more than available', async () => {
    const res = await request
      .put('/api/v1/bloodbank/inventory/O%2B')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        action: 'REMOVE',
        units: 9999, // exceeds stock
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');
  });

  it('POST /donations: should record incoming donation, update donor eligibility, and increment inventory in a transaction', async () => {
    // Create an active appointment
    const appt = await Appointment.create({
      donor: donorUser._id,
      bloodBank: verifiedBloodBank._id,
      slotDate: new Date(),
      slotTime: '11:00 AM - 12:00 PM',
      status: 'BOOKED',
    });

    const res = await request
      .post('/api/v1/bloodbank/donations')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        donorId: donorUser._id.toString(),
        appointmentId: appt._id.toString(),
        bloodGroup: 'O+',
        units: 1,
        remarks: 'Donation collection completed without adverse reactions',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.donation).toBeDefined();
    expect(res.body.donation.units).toBe(1);

    // Appointment marked COMPLETED
    const updatedAppt = await Appointment.findById(appt._id);
    expect(updatedAppt.status).toBe('COMPLETED');

    // DonorProfile cooldown updated (90 days male)
    const updatedProfile = await DonorProfile.findOne({ user: donorUser._id });
    expect(updatedProfile.isAvailable).toBe(false);
    expect(updatedProfile.totalDonations).toBe(3);

    // Donor notified
    const donorNotif = await Notification.findOne({
      user: donorUser._id,
      type: 'DONATION_RECORDED',
    });
    expect(donorNotif).not.toBeNull();
  });

  it('POST /issue: should issue units linked to approved request, decrement stock, and prevent negative stock', async () => {
    // 1. Ensure we have stock for A+
    await request
      .put('/api/v1/bloodbank/inventory/A%2B')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({ action: 'SET', available: 5 });

    // 2. Create an approved blood request
    const bloodReq = await BloodRequest.create({
      requester: donorUser._id,
      hospital: verifiedHospital._id,
      hospitalName: verifiedHospital.name,
      patientName: 'Priya Verma',
      bloodGroup: 'A+',
      units: 2,
      status: 'APPROVED',
      city: 'Mumbai',
      contactNumber: '9833333331',
    });

    // 3. Issue 2 units
    const res = await request
      .post('/api/v1/bloodbank/issue')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        requestId: bloodReq._id.toString(),
        bloodGroup: 'A+',
        units: 2,
        issuedTo: 'Priya Verma',
        remarks: 'Issued for planned transfusion',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue.units).toBe(2);

    // Verify inventory decremented: 5 - 2 = 3
    const invA = await BloodInventory.findOne({
      bloodBank: verifiedBloodBank._id,
      bloodGroup: 'A+',
    });
    expect(invA.available).toBe(3);

    // Verify BloodRequest marked as FULFILLED
    const updatedReq = await BloodRequest.findById(bloodReq._id);
    expect(updatedReq.status).toBe('FULFILLED');

    // 4. Test preventing negative stock: Attempt to issue 10 units when only 3 remain
    const failRes = await request
      .post('/api/v1/bloodbank/issue')
      .set('Authorization', `Bearer ${verifiedBankToken}`)
      .send({
        requestId: bloodReq._id.toString(),
        bloodGroup: 'A+',
        units: 10,
      });

    expect(failRes.status).toBe(400);
    expect(failRes.body.message).toContain('Insufficient available stock');
  });

  it('GET /history: should return unified timeline of donations and issued units', async () => {
    const res = await request
      .get('/api/v1/bloodbank/history?type=ALL&page=1&limit=20')
      .set('Authorization', `Bearer ${verifiedBankToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.history.length).toBeGreaterThanOrEqual(2);

    const types = res.body.history.map((h) => h.type);
    expect(types).toContain('DONATION');
    expect(types).toContain('ISSUE');
  });
});

describe('4. Inventory Rules & Shelf-Life Expiry Cron', () => {
  it('should mark units expired past 35-day shelf life and send low-stock alert to bank & admin', async () => {
    // Seed an inventory batch with expiryDate in the past
    const pastExpiryDate = new Date(Date.now() - 2 * 86400000); // 2 days ago
    const invB = await BloodInventory.findOneAndUpdate(
      { bloodBank: verifiedBloodBank._id, bloodGroup: 'AB-' },
      {
        available: 3,
        unitsAvailable: 3,
        reserved: 0,
        expired: 0,
        lowStockThreshold: 5,
        batches: [
          {
            unitId: 'BATCH-EXPIRED-001',
            bloodGroup: 'AB-',
            collectedDate: new Date(Date.now() - 40 * 86400000), // 40 days old (> 35 days)
            expiryDate: pastExpiryDate,
            status: 'AVAILABLE',
          },
        ],
      },
      { upsert: true, new: true }
    );

    // Run the cron audit function
    const summary = await runDailyExpiryCheck();

    expect(summary.totalExpiredUnits).toBeGreaterThanOrEqual(1);

    // Verify stock moved to expired
    const updatedInv = await BloodInventory.findById(invB._id);
    expect(updatedInv.available).toBe(2); // 3 - 1
    expect(updatedInv.expired).toBe(1);

    // Low stock alert was sent because available (2) <= threshold (5)
    expect(summary.lowStockAlertsSent).toBeGreaterThanOrEqual(1);

    // Verify low-stock notification created for blood bank staff
    const bankNotif = await Notification.findOne({
      user: verifiedBankUser._id,
      type: 'LOW_STOCK_ALERT',
    });
    expect(bankNotif).not.toBeNull();
    expect(bankNotif.title).toContain('Low Stock');
  });
});
