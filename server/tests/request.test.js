/**
 * Blood Requests API Integration & State Machine Tests (/api/v1/requests)
 *
 * Tests:
 * - POST / (USER & HOSPITAL creation, auto-linking hospitalId for hospital role, initial statusHistory, notification)
 * - GET /my (paginated, filter by status)
 * - GET /:id (with populated statusHistory)
 * - PUT /:id/cancel (state machine check, statusHistory, notification)
 * - POST /:id/confirm-received (hospital confirmation, FULFILLED status, statusHistory, notification)
 * - State Machine: PENDING -> APPROVED -> DONOR_ASSIGNED -> IN_PROGRESS -> FULFILLED
 * - Invalid transitions throw 400
 */
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  Hospital,
  BloodRequest,
  Notification,
} from '../src/models/index.js';
import requestRoutes from '../src/routes/request.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';

// Setup test Express app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/requests', requestRoutes);
app.use((err, req, res, next) => {
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(status).json({ success: false, message: err.message });
});

let mongoServer;
let request;

let regularUser;
let regularToken;

let hospitalUser;
let hospitalToken;
let testHospital;

let otherUser;
let otherToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // ── 1. Regular User ──
  regularUser = await User.create({
    name: 'Regular Requester',
    email: 'user.requester@test.com',
    phone: '9876543201',
    mobile: '9876543201',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Mumbai',
  });
  regularToken = generateTokens(regularUser).accessToken;

  // ── 2. Hospital User & Facility ──
  hospitalUser = await User.create({
    name: 'Hospital Admin',
    email: 'hospital.admin@test.com',
    phone: '9876543202',
    mobile: '9876543202',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Mumbai',
  });
  hospitalToken = generateTokens(hospitalUser).accessToken;

  testHospital = await Hospital.create({
    user: hospitalUser._id,
    createdBy: hospitalUser._id,
    name: 'City Care Hospital',
    licenseNumber: 'HOSP-MUM-999',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '022-26001111',
    verificationStatus: 'VERIFIED',
    isVerified: true,
  });

  // ── 3. Unrelated User (for authorization checks) ──
  otherUser = await User.create({
    name: 'Other Person',
    email: 'other.person@test.com',
    phone: '9876543203',
    mobile: '9876543203',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Delhi',
  });
  otherToken = generateTokens(otherUser).accessToken;
}, 180000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}, 15000);

// ─────────────────────────────────────────────────────────────────
// 1. POST /api/v1/requests (Creation & Auto-linking)
// ─────────────────────────────────────────────────────────────────
describe('POST /api/v1/requests', () => {
  it('should allow USER to create a request with initial PENDING status & statusHistory', async () => {
    const res = await request
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        patientName: 'Aarav Sharma',
        bloodGroup: 'O+',
        units: 2,
        city: 'Mumbai',
        urgency: 'URGENT',
        notes: 'Pre-surgery requirement',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request).toBeDefined();
    expect(res.body.request.status).toBe('PENDING');
    expect(res.body.request.patientName).toBe('Aarav Sharma');
    expect(res.body.request.units).toBe(2);

    // Initial statusHistory check
    expect(Array.isArray(res.body.request.statusHistory)).toBe(true);
    expect(res.body.request.statusHistory.length).toBe(1);
    expect(res.body.request.statusHistory[0].status).toBe('PENDING');
    expect(res.body.request.statusHistory[0].changedBy.toString()).toBe(regularUser._id.toString());

    // Notification created for requester
    const notification = await Notification.findOne({
      user: regularUser._id,
      type: 'REQUEST_CREATED',
    });
    expect(notification).not.toBeNull();
    expect(notification.title).toContain('Submitted');
  });

  it('should auto-link hospitalId and hospitalName when HOSPITAL creates request', async () => {
    const res = await request
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        patientName: 'Sunita Patel',
        bloodGroup: 'B+',
        units: 3,
        city: 'Mumbai',
        urgency: 'CRITICAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.request.hospital.toString()).toBe(testHospital._id.toString());
    expect(res.body.request.hospitalName).toBe('City Care Hospital');
    expect(res.body.request.status).toBe('PENDING');
  });

  it('should reject missing required fields with 400', async () => {
    const res = await request
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        patientName: 'Incomplete',
        // bloodGroup missing
        units: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid units (< 1) with 400', async () => {
    const res = await request
      .post('/api/v1/requests')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({
        patientName: 'Invalid Units',
        bloodGroup: 'A+',
        units: 0,
        city: 'Mumbai',
      });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. GET /api/v1/requests/my (Pagination & Filtering)
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/requests/my', () => {
  it('should return paginated requests for the authenticated user', async () => {
    const res = await request
      .get('/api/v1/requests/my?page=1&limit=5')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.requests)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('should filter requests by status', async () => {
    const res = await request
      .get('/api/v1/requests/my?status=PENDING')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(200);
    expect(res.body.requests.every((r) => r.status === 'PENDING')).toBe(true);
  });

  it('should return hospital requests for HOSPITAL role', async () => {
    const res = await request
      .get('/api/v1/requests/my')
      .set('Authorization', `Bearer ${hospitalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.requests.length).toBeGreaterThanOrEqual(1);
    expect(res.body.requests[0].hospitalName).toBe('City Care Hospital');
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. GET /api/v1/requests/:id (Details & statusHistory)
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/requests/:id', () => {
  let createdRequestId;

  beforeAll(async () => {
    const doc = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'Detail Test',
      bloodGroup: 'AB+',
      units: 1,
      city: 'Mumbai',
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          changedBy: regularUser._id,
          note: 'Initial submission',
          changedAt: new Date(),
        },
      ],
    });
    createdRequestId = doc._id.toString();
  });

  it('should return request with complete statusHistory array', async () => {
    const res = await request
      .get(`/api/v1/requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(200);
    expect(res.body.request._id).toBe(createdRequestId);
    expect(Array.isArray(res.body.request.statusHistory)).toBe(true);
    expect(res.body.request.statusHistory.length).toBe(1);
    expect(res.body.request.statusHistory[0].status).toBe('PENDING');
    expect(res.body.request.requester.name).toBe('Regular Requester');
  });

  it('should return 403 for unauthorized user viewing another user request', async () => {
    const res = await request
      .get(`/api/v1/requests/${createdRequestId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. PUT /api/v1/requests/:id/cancel
// ─────────────────────────────────────────────────────────────────
describe('PUT /api/v1/requests/:id/cancel', () => {
  it('should cancel a PENDING request and append to statusHistory', async () => {
    const doc = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'To Cancel',
      bloodGroup: 'O-',
      units: 1,
      city: 'Mumbai',
      status: 'PENDING',
      statusHistory: [{ status: 'PENDING', changedBy: regularUser._id }],
    });

    const res = await request
      .put(`/api/v1/requests/${doc._id}/cancel`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ reason: 'Donor found privately' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('CANCELLED');

    // Verify history appended
    const history = res.body.request.statusHistory;
    expect(history.length).toBe(2);
    expect(history[1].status).toBe('CANCELLED');
    expect(history[1].note).toBe('Donor found privately');

    // Verify notification
    const notification = await Notification.findOne({
      user: regularUser._id,
      type: 'REQUEST_CANCELLED',
      'meta.requestId': doc._id,
    });
    expect(notification).not.toBeNull();
  });

  it('should reject cancelling an already CANCELLED request (invalid transition)', async () => {
    const doc = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'Already Cancelled',
      bloodGroup: 'O-',
      units: 1,
      city: 'Mumbai',
      status: 'CANCELLED',
      statusHistory: [{ status: 'CANCELLED', changedBy: regularUser._id }],
    });

    const res = await request
      .put(`/api/v1/requests/${doc._id}/cancel`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ reason: 'Cancel again' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid status transition');
  });

  it('should reject cancelling an already FULFILLED request', async () => {
    const doc = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'Fulfilled Request',
      bloodGroup: 'A+',
      units: 2,
      city: 'Mumbai',
      status: 'FULFILLED',
      statusHistory: [{ status: 'FULFILLED', changedBy: regularUser._id }],
    });

    const res = await request
      .put(`/api/v1/requests/${doc._id}/cancel`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid status transition');
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. POST /api/v1/requests/:id/confirm-received
// ─────────────────────────────────────────────────────────────────
describe('POST /api/v1/requests/:id/confirm-received', () => {
  it('should allow hospital to confirm units received and fulfill request', async () => {
    const doc = await BloodRequest.create({
      requester: regularUser._id,
      hospital: testHospital._id,
      patientName: 'Transfusion Patient',
      bloodGroup: 'B+',
      units: 2,
      city: 'Mumbai',
      status: 'IN_PROGRESS',
      statusHistory: [
        { status: 'PENDING', changedBy: regularUser._id },
        { status: 'APPROVED', changedBy: hospitalUser._id },
        { status: 'DONOR_ASSIGNED', changedBy: hospitalUser._id },
        { status: 'IN_PROGRESS', changedBy: hospitalUser._id },
      ],
    });

    const res = await request
      .post(`/api/v1/requests/${doc._id}/confirm-received`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({
        unitsReceived: 2,
        note: 'Transfusion successful',
      });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('FULFILLED');

    const history = res.body.request.statusHistory;
    expect(history[history.length - 1].status).toBe('FULFILLED');
    expect(history[history.length - 1].note).toBe('Transfusion successful');

    // Requester gets notified
    const notification = await Notification.findOne({
      user: regularUser._id,
      type: 'REQUEST_FULFILLED',
      'meta.requestId': doc._id,
    });
    expect(notification).not.toBeNull();
    expect(notification.title).toContain('Fulfilled');
  });

  it('should reject confirm-received if called by regular USER role', async () => {
    const doc = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'User Confirm Attempt',
      bloodGroup: 'B+',
      units: 1,
      city: 'Mumbai',
      status: 'IN_PROGRESS',
    });

    const res = await request
      .post(`/api/v1/requests/${doc._id}/confirm-received`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. STATE MACHINE ENFORCEMENT & TRANSITIONS
// ─────────────────────────────────────────────────────────────────
describe('State Machine: PENDING -> APPROVED -> DONOR_ASSIGNED -> IN_PROGRESS -> FULFILLED', () => {
  let smRequest;

  beforeAll(async () => {
    smRequest = await BloodRequest.create({
      requester: regularUser._id,
      hospital: testHospital._id,
      patientName: 'StateMachine Workflow',
      bloodGroup: 'AB-',
      units: 1,
      city: 'Mumbai',
      status: 'PENDING',
      statusHistory: [{ status: 'PENDING', changedBy: regularUser._id }],
    });
  });

  it('should advance PENDING -> APPROVED', async () => {
    const res = await request
      .patch(`/api/v1/requests/${smRequest._id}/status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ status: 'APPROVED', note: 'Medical documents verified' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('APPROVED');

    // Notification check
    const notif = await Notification.findOne({
      user: regularUser._id,
      type: 'REQUEST_APPROVED',
      'meta.requestId': smRequest._id,
    });
    expect(notif).not.toBeNull();
  });

  it('should advance APPROVED -> DONOR_ASSIGNED', async () => {
    const res = await request
      .patch(`/api/v1/requests/${smRequest._id}/status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ status: 'DONOR_ASSIGNED', note: 'Matching donor accepted' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('DONOR_ASSIGNED');
  });

  it('should advance DONOR_ASSIGNED -> IN_PROGRESS', async () => {
    const res = await request
      .patch(`/api/v1/requests/${smRequest._id}/status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ status: 'IN_PROGRESS', note: 'Donor at facility, collection started' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('IN_PROGRESS');
  });

  it('should advance IN_PROGRESS -> FULFILLED', async () => {
    const res = await request
      .patch(`/api/v1/requests/${smRequest._id}/status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ status: 'FULFILLED', note: 'Units issued and verified' });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('FULFILLED');
  });

  it('should reject invalid transition from FULFILLED (terminal state)', async () => {
    const res = await request
      .patch(`/api/v1/requests/${smRequest._id}/status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ status: 'PENDING' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid status transition');
    expect(res.body.message).toContain('Terminal state');
  });

  it('should reject illegal direct jump: PENDING -> FULFILLED', async () => {
    const freshDoc = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'Illegal Jump',
      bloodGroup: 'O+',
      units: 1,
      city: 'Mumbai',
      status: 'PENDING',
    });

    const res = await request
      .patch(`/api/v1/requests/${freshDoc._id}/status`)
      .set('Authorization', `Bearer ${hospitalToken}`)
      .send({ status: 'FULFILLED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid status transition');
    expect(res.body.message).toContain('Allowed next states');
  });

  it('should record every change in statusHistory with timestamp and actor', async () => {
    const updated = await BloodRequest.findById(smRequest._id);
    expect(updated.statusHistory.length).toBe(5); // PENDING, APPROVED, DONOR_ASSIGNED, IN_PROGRESS, FULFILLED
    const statuses = updated.statusHistory.map((h) => h.status);
    expect(statuses).toEqual(['PENDING', 'APPROVED', 'DONOR_ASSIGNED', 'IN_PROGRESS', 'FULFILLED']);
  });
});
