/**
 * End-to-End Verification Test for the 3 Connected Workflows:
 * Workflow 1: Blood Bank "Issue Units" against a Request
 * Workflow 2: Auto Status Update + Notification to Requester (Full & Partial)
 * Workflow 3: Hospital "Confirm Units Received" (Hospital-Only, Post-Fulfillment)
 * Insufficient Stock Prevention (Transaction rollback, zero negative stock)
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
  Hospital,
  BloodRequest,
  BloodInventory,
  BloodIssue,
  Notification,
} from '../src/models/index.js';

import requestRoutes from '../src/routes/request.routes.js';
import bloodBankRoutes from '../src/routes/bloodbank.routes.js';
import hospitalRoutes from '../src/routes/hospital.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/bloodbank', bloodBankRoutes);
app.use('/api/v1/hospital', hospitalRoutes);

app.use((err, req, res, next) => {
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(status).json({ success: false, message: err.message });
});

jest.setTimeout(60000);

let mongoServer;
let request;

// Users & Entities
let bankUser, bankToken, bloodBank;
let hospitalUser, hospitalToken, hospital;
let hospitalUser2, hospitalToken2, hospital2;
let regularUser, regularToken;
let adminUser, adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // 1. Blood Bank Staff & Profile
  bankUser = await User.create({
    name: 'Apollo Blood Bank Lead',
    email: 'apollo.bank@test.com',
    phone: '9876543210',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  bankToken = generateTokens(bankUser._id, 'BLOOD_BANK').accessToken;

  bloodBank = await BloodBank.create({
    user: bankUser._id,
    name: 'Apollo Regional Blood Centre',
    licenseNumber: 'BB-LIC-9988',
    registrationNumber: 'REG-BB-101',
    address: 'Sector 5, Salt Lake',
    city: 'Mumbai',
    phone: '9876543210',
    email: 'apollo.bank@test.com',
    verificationStatus: 'VERIFIED',
    isActive: true,
  });

  // Provision Blood Bank Inventory
  await BloodInventory.create([
    {
      bloodBank: bloodBank._id,
      bloodGroup: 'O+',
      available: 5,
      unitsAvailable: 5,
      reserved: 0,
      unitsReserved: 0,
      expired: 0,
      lowStockThreshold: 2,
    },
    {
      bloodBank: bloodBank._id,
      bloodGroup: 'A+',
      available: 3,
      unitsAvailable: 3,
      reserved: 0,
      unitsReserved: 0,
      expired: 0,
      lowStockThreshold: 2,
    },
    {
      bloodBank: bloodBank._id,
      bloodGroup: 'B-',
      available: 1,
      unitsAvailable: 1,
      reserved: 0,
      unitsReserved: 0,
      expired: 0,
      lowStockThreshold: 1,
    },
  ]);

  // 2. Hospital 1 Staff & Profile
  hospitalUser = await User.create({
    name: 'Lilavati Transfusion Dept',
    email: 'lilavati@hospital.test',
    phone: '9876543211',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  hospitalToken = generateTokens(hospitalUser._id, 'HOSPITAL').accessToken;

  hospital = await Hospital.create({
    user: hospitalUser._id,
    name: 'Lilavati Super Specialty Hospital',
    licenseNumber: 'HOSP-LIC-4455',
    address: 'Bandra West',
    city: 'Mumbai',
    phone: '9876543211',
    verificationStatus: 'VERIFIED',
    isActive: true,
  });

  // 3. Hospital 2 (Foreign Hospital for unauthorized verification check)
  hospitalUser2 = await User.create({
    name: 'Fortis Healthcare Dept',
    email: 'fortis@hospital.test',
    phone: '9876543212',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  hospitalToken2 = generateTokens(hospitalUser2._id, 'HOSPITAL').accessToken;

  hospital2 = await Hospital.create({
    user: hospitalUser2._id,
    name: 'Fortis Hospital Mumbai',
    licenseNumber: 'HOSP-LIC-7788',
    address: 'Mulund',
    city: 'Mumbai',
    phone: '9876543212',
    verificationStatus: 'VERIFIED',
    isActive: true,
  });

  // 4. Regular User (Patient/Requester)
  regularUser = await User.create({
    name: 'Suresh Kumar',
    email: 'suresh.patient@test.com',
    phone: '9876543213',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  regularToken = generateTokens(regularUser._id, 'USER').accessToken;

  // 5. Admin
  adminUser = await User.create({
    name: 'System Admin',
    email: 'admin.super@test.com',
    phone: '9876543214',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  adminToken = generateTokens(adminUser._id, 'ADMIN').accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Full Chain Verification: Issue Units -> Auto-FULFILLED -> Confirm Received', () => {
  let hospitalReqId;
  let userReqId;
  let partialReqId;

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Hospital creates BloodRequest with existing bank stock
  // ─────────────────────────────────────────────────────────────────
  it('Step 1: Hospital creates BloodRequest for 2 units of O+ and gets approved', async () => {
    const res = await request
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        patientName: 'Kavita Sharma',
        bloodGroup: 'O+',
        units: 2,
        city: 'Mumbai',
        urgency: 'URGENT',
        notes: 'Pre-surgery preparation',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request.bloodGroup).toBe('O+');
    expect(res.body.request.units).toBe(2);
    expect(res.body.request.hospital).toBe(hospital._id.toString());
    hospitalReqId = res.body.request._id;

    // Transition to APPROVED so units can be issued
    await BloodRequest.findByIdAndUpdate(hospitalReqId, {
      status: 'APPROVED',
      $push: {
        statusHistory: {
          status: 'APPROVED',
          changedBy: hospitalUser._id,
          note: 'Clinically approved for issue',
          changedAt: new Date(),
        },
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Blood Bank issues units fully against Hospital Request
  // ─────────────────────────────────────────────────────────────────
  it('Step 2: Blood Bank issues 2 units of O+ fully -> decrements inventory, creates BloodIssue, sets FULFILLED, notifies Hospital', async () => {
    // Check initial stock
    const initialInv = await BloodInventory.findOne({
      bloodBank: bloodBank._id,
      bloodGroup: 'O+',
    });
    expect(initialInv.available).toBe(5);

    const res = await request
      .post('/api/v1/bloodbank/issue')
      .set('Authorization', `Bearer ${bankToken}`)
      .send({
        requestId: hospitalReqId,
        bloodGroup: 'O+',
        units: 2,
        bagNo: 'PRBC-2026-001, PRBC-2026-002',
        issuedTo: 'Lilavati Transfusion Ambulance Team',
        remarks: 'Cold-chain 4°C verified cross-match passed',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.issue).toBeDefined();
    expect(res.body.issue.units).toBe(2);
    expect(res.body.issue.bloodGroup).toBe('O+');

    // 1. Inventory decreased correctly (5 - 2 = 3)
    const updatedInv = await BloodInventory.findOne({
      bloodBank: bloodBank._id,
      bloodGroup: 'O+',
    });
    expect(updatedInv.available).toBe(3);
    expect(updatedInv.unitsAvailable).toBe(3);

    // 2. BloodIssue record created
    const issueRecord = await BloodIssue.findOne({ request: hospitalReqId });
    expect(issueRecord).not.toBeNull();
    expect(issueRecord.bloodBank.toString()).toBe(bloodBank._id.toString());
    expect(issueRecord.units).toBe(2);

    // 3. BloodRequest status automatically became FULFILLED
    const updatedReq = await BloodRequest.findById(hospitalReqId);
    expect(updatedReq.status).toBe('FULFILLED');
    expect(updatedReq.unitsIssued).toBe(2);

    // statusHistory contains FULFILLED
    const fulfillHistory = updatedReq.statusHistory.find((h) => h.status === 'FULFILLED');
    expect(fulfillHistory).toBeDefined();

    // 4. Hospital user received notification
    const notification = await Notification.findOne({
      user: hospitalUser._id,
      type: 'REQUEST_FULFILLED',
      'meta.requestId': updatedReq._id,
    });
    expect(notification).not.toBeNull();
    expect(notification.message).toContain('fulfilled');
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Hospital confirms receipt of units
  // ─────────────────────────────────────────────────────────────────
  it('Step 3: Hospital confirms receipt -> sets confirmedReceived: true, saves timestamp, and persists', async () => {
    const res = await request
      .put(`/api/v1/requests/${hospitalReqId}/confirm-received`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        note: 'Cross-match compatible, transfused into patient',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm DB persistence
    const confirmedReq = await BloodRequest.findById(hospitalReqId);
    expect(confirmedReq.confirmedReceived).toBe(true);
    expect(confirmedReq.confirmedAt).not.toBeNull();
    expect(confirmedReq.confirmedBy.toString()).toBe(hospitalUser._id.toString());
    expect(confirmedReq.status).toBe('FULFILLED');

    // Confirm Blood Bank received completion notification
    const bbNotification = await Notification.findOne({
      user: bankUser._id,
      type: 'REQUEST_COMPLETED',
      'meta.requestId': confirmedReq._id,
    });
    expect(bbNotification).not.toBeNull();
    expect(bbNotification.title).toContain('Received');
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Unauthorized hospital cannot confirm another hospital's request
  // ─────────────────────────────────────────────────────────────────
  it('Step 4: Foreign hospital cannot confirm receipt for this request (403 Forbidden)', async () => {
    const res = await request
      .put(`/api/v1/requests/${hospitalReqId}/confirm-received`)
      .set('Authorization', `Bearer ${hospitalToken2}`)
      .send({ note: 'Malicious confirm attempt' });

    expect(res.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Chain repeated for regular USER (no hospital association)
  // ─────────────────────────────────────────────────────────────────
  it('Step 5: Regular USER request gets fulfilled -> receives notification, but confirm-received is blocked (403)', async () => {
    // 1. Regular user creates request
    const createRes = await request
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        patientName: 'Aarav Patel',
        bloodGroup: 'A+',
        units: 1,
        city: 'Mumbai',
        urgency: 'ROUTINE',
      });

    expect(createRes.status).toBe(201);
    userReqId = createRes.body.request._id;

    // Approve request
    await BloodRequest.findByIdAndUpdate(userReqId, {
      status: 'APPROVED',
      $push: {
        statusHistory: {
          status: 'APPROVED',
          changedBy: adminUser._id,
          note: 'Approved for unit issuance',
        },
      },
    });

    // 2. Blood Bank issues 1 unit of A+
    const issueRes = await request
      .post('/api/v1/bloodbank/issue')
      .set('Authorization', `Bearer ${bankToken}`)
      .send({
        requestId: userReqId,
        bloodGroup: 'A+',
        units: 1,
        bagNo: 'PRBC-A-9901',
        issuedTo: 'Patient Relative Suresh Kumar',
      });

    expect(issueRes.status).toBe(200);

    // Confirm inventory decreased (3 - 1 = 2)
    const invA = await BloodInventory.findOne({
      bloodBank: bloodBank._id,
      bloodGroup: 'A+',
    });
    expect(invA.available).toBe(2);

    // Confirm request is FULFILLED
    const userReq = await BloodRequest.findById(userReqId);
    expect(userReq.status).toBe('FULFILLED');
    expect(userReq.unitsIssued).toBe(1);

    // Confirm USER received notification
    const userNotif = await Notification.findOne({
      user: regularUser._id,
      type: 'REQUEST_FULFILLED',
      'meta.requestId': userReq._id,
    });
    expect(userNotif).not.toBeNull();
    expect(userNotif.message).toContain('fulfilled');

    // 3. Regular USER attempts to call confirm-received -> BLOCKED (403 Forbidden)
    const userConfirmRes = await request
      .put(`/api/v1/requests/${userReqId}/confirm-received`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect(userConfirmRes.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: Partial Issue Workflow (Status stays IN_PROGRESS, partial notification)
  // ─────────────────────────────────────────────────────────────────
  it('Step 6: Partial issue (1 of 2 units) keeps status IN_PROGRESS and notifies partial progress', async () => {
    // Create hospital request for 2 units of B-
    const reqDoc = await BloodRequest.create({
      requester: hospitalUser._id,
      hospital: hospital._id,
      hospitalName: hospital.name,
      patientName: 'Partial Test Patient',
      bloodGroup: 'B-',
      units: 2,
      city: 'Mumbai',
      status: 'APPROVED',
      statusHistory: [{ status: 'APPROVED', changedBy: hospitalUser._id }],
    });
    partialReqId = reqDoc._id;

    // Issue only 1 unit (out of 2 required)
    const issueRes = await request
      .post('/api/v1/bloodbank/issue')
      .set('Authorization', `Bearer ${bankToken}`)
      .send({
        requestId: partialReqId,
        bloodGroup: 'B-',
        units: 1,
        bagNo: 'BAG-B-001',
      });

    expect(issueRes.status).toBe(200);

    const partialReq = await BloodRequest.findById(partialReqId);
    // MUST NOT be FULFILLED
    expect(partialReq.status).toBe('IN_PROGRESS');
    expect(partialReq.unitsIssued).toBe(1);

    // Partial progress notification sent
    const partialNotif = await Notification.findOne({
      user: hospitalUser._id,
      type: 'REQUEST_PARTIALLY_FULFILLED',
      'meta.requestId': partialReq._id,
    });
    expect(partialNotif).not.toBeNull();
    expect(partialNotif.message).toBe('1 of 2 units fulfilled so far.');
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: Insufficient Stock Rejection (No negative stock allowed)
  // ─────────────────────────────────────────────────────────────────
  it('Step 7: Insufficient stock rejected with clear error and 0 changes to DB', async () => {
    // Current B- stock is 0 (was 1, decremented by 1 in previous test)
    const currentBInv = await BloodInventory.findOne({
      bloodBank: bloodBank._id,
      bloodGroup: 'B-',
    });
    expect(currentBInv.available).toBe(0);

    // Try issuing 1 more unit of B-
    const res = await request
      .post('/api/v1/bloodbank/issue')
      .set('Authorization', `Bearer ${bankToken}`)
      .send({
        requestId: partialReqId,
        bloodGroup: 'B-',
        units: 1,
        bagNo: 'BAG-B-EXCESS',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient available stock');
    expect(res.body.message).toContain('Stock cannot be negative');

    // Confirm inventory remains exactly 0 (no negative stock)
    const recheckInv = await BloodInventory.findOne({
      bloodBank: bloodBank._id,
      bloodGroup: 'B-',
    });
    expect(recheckInv.available).toBe(0);

    // Confirm no new BloodIssue created
    const issuesCount = await BloodIssue.countDocuments({
      request: partialReqId,
    });
    expect(issuesCount).toBe(1); // Still only the 1 prior issue
  });
});
