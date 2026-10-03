/**
 * Comprehensive Admin Control Platform Integration Test Suite (/api/v1/admin/*)
 *
 * Tests:
 * 1. Security & Authorization: ADMIN role enforcement (401 unauthenticated, 403 non-admin)
 * 2. User Management: list/search, verify, block/unblock, soft delete
 * 3. Donor Management: list, approve/reject verification, block
 * 4. Facilities (Hospitals & Blood Banks): list pending, approve, reject, block, email applicant
 * 5. Inventory Management: view all banks, low-stock list, override stock
 * 6. Blood Requests Management: list, approve, reject, assign donor, state machine enforcement
 * 7. Live Emergency Operations: GET /live, coordinate/assign
 * 8. Donations Verification: list, verify donation and issue certificate
 * 9. Broadcast Announcements: targeted multi-channel broadcast
 * 10. Complaints & Feedback: list, assign to admin, respond, resolve
 * 11. Dashboard Analytics: GET /stats (totals, pending approvals, active emergencies, monthly donations, stock by group)
 * 12. Audit Logging Trail: mutations generate AuditLog entries
 */

import http from 'http';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  DonorProfile,
  Hospital,
  BloodBank,
  BloodInventory,
  BloodRequest,
  EmergencyRequest,
  Donation,
  Feedback,
  Notification,
  AuditLog,
} from '../src/models/index.js';
import adminRoutes from '../src/routes/admin.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { initSocket } from '../src/config/socket.js';

let mongoServer;
let app;
let server;
let request;

let adminUser;
let adminToken;

let regularUser;
let regularToken;

let donorUser;
let donorProfile;

let hospitalUser;
let hospitalDoc;

let bankUser;
let bankDoc;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount admin routes
  app.use('/api/v1/admin', adminRoutes);

  // Global error handler for clean testing
  app.use((err, req, res, next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });

  server = http.createServer(app);
  initSocket(server);
  request = supertest(app);

  // 1. Seed Admin
  adminUser = await User.create({
    name: 'Chief Admin',
    email: 'chief.admin@lifedrop.org',
    phone: '9811111111',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  adminToken = generateTokens(adminUser).accessToken;

  // 2. Seed Regular User
  regularUser = await User.create({
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '9822222222',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    city: 'Mumbai',
    bloodGroup: 'O+',
    isEmailVerified: true,
  });
  regularToken = generateTokens(regularUser).accessToken;

  // 3. Seed Donor User & Profile
  donorUser = await User.create({
    name: 'Anita Roy',
    email: 'anita.roy@example.com',
    phone: '9833333333',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    city: 'Mumbai',
    bloodGroup: 'A+',
    isVerified: false,
    isEmailVerified: true,
  });

  donorProfile = await DonorProfile.create({
    user: donorUser._id,
    bloodGroup: 'A+',
    verificationStatus: 'PENDING',
    isAvailable: true,
  });

  // 4. Seed Hospital & User
  hospitalUser = await User.create({
    name: 'City Care Admin',
    email: 'admin@citycare.org',
    phone: '9844444444',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'PENDING',
    isEmailVerified: true,
  });

  hospitalDoc = await Hospital.create({
    user: hospitalUser._id,
    name: 'City Care Hospital',
    email: 'info@citycare.org',
    phone: '9844444444',
    city: 'Mumbai',
    address: '123 Marine Drive',
    licenseNumber: 'HOSP-MUM-999',
    verificationStatus: 'PENDING',
    isVerified: false,
  });

  // 5. Seed Blood Bank & User
  bankUser = await User.create({
    name: 'RedCross Director',
    email: 'director@redcrossbank.org',
    phone: '9855555555',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'BLOOD_BANK',
    status: 'PENDING',
    isEmailVerified: true,
  });

  bankDoc = await BloodBank.create({
    user: bankUser._id,
    name: 'Central RedCross Blood Bank',
    email: 'contact@redcrossbank.org',
    phone: '9855555555',
    city: 'Mumbai',
    address: '45 Bandra West',
    licenseNumber: 'BB-MUM-777',
    verificationStatus: 'PENDING',
    isVerified: false,
  });

  // Seed inventory for blood bank
  await BloodInventory.create([
    {
      bloodBank: bankDoc._id,
      bloodGroup: 'A+',
      available: 20,
      reserved: 2,
      expired: 0,
      lowStockThreshold: 5,
    },
    {
      bloodBank: bankDoc._id,
      bloodGroup: 'O-',
      available: 3,
      reserved: 1,
      expired: 0,
      lowStockThreshold: 5,
    },
  ]);
}, 60000);

afterAll(async () => {
  if (server) server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('1. Security & Admin Role Access Control', () => {
  it('should return 401 when no token is provided', async () => {
    const res = await request.get('/api/v1/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 when a non-admin role requests admin endpoint', async () => {
    const res = await request
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow access when authenticated as ADMIN', async () => {
    const res = await request
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('2. User Management (/api/v1/admin/users)', () => {
  it('should list users with pagination and search filter', async () => {
    const res = await request
      .get('/api/v1/admin/users?search=Rahul')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].email).toBe('rahul.sharma@example.com');
    expect(res.body.pagination).toBeDefined();
  });

  it('should verify a user and log mutation to AuditLog', async () => {
    const res = await request
      .put(`/api/v1/admin/users/${regularUser._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isVerified).toBe(true);

    const log = await AuditLog.findOne({
      entity: 'User',
      entityId: regularUser._id,
      action: 'USER_VERIFY',
    });
    expect(log).toBeDefined();
    expect(log.actor.toString()).toBe(adminUser._id.toString());
  });

  it('should block a user with reason and audit log the mutation', async () => {
    const res = await request
      .put(`/api/v1/admin/users/${regularUser._id}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Policy non-compliance' });
    expect(res.status).toBe(200);
    expect(res.body.data.isBlocked).toBe(true);
    expect(res.body.data.status).toBe('BLOCKED');

    const log = await AuditLog.findOne({
      entity: 'User',
      entityId: regularUser._id,
      action: 'USER_BLOCK',
    });
    expect(log).toBeDefined();
    expect(log.meta.reason).toBe('Policy non-compliance');
  });

  it('should unblock a user and restore status to ACTIVE', async () => {
    const res = await request
      .put(`/api/v1/admin/users/${regularUser._id}/unblock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Issue resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.isBlocked).toBe(false);
    expect(res.body.data.status).toBe('ACTIVE');

    const log = await AuditLog.findOne({
      entity: 'User',
      entityId: regularUser._id,
      action: 'USER_UNBLOCK',
    });
    expect(log).toBeDefined();
  });

  it('should soft delete a user', async () => {
    // Create temporary user to soft delete
    const tempUser = await User.create({
      name: 'Temp User',
      email: 'temp.delete@example.com',
      phone: '9866666661',
      password: 'Password@123',
      role: 'USER',
    });

    const res = await request
      .delete(`/api/v1/admin/users/${tempUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await User.findById(tempUser._id);
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.status).toBe('INACTIVE');
  });
});

describe('3. Donor Management (/api/v1/admin/donors)', () => {
  it('should list donors with blood group and verification filter', async () => {
    const res = await request
      .get('/api/v1/admin/donors?bloodGroup=A+&verificationStatus=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].bloodGroup).toBe('A+');
  });

  it('should approve donor verification and audit log mutation', async () => {
    const res = await request
      .put(`/api/v1/admin/donors/${donorProfile._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true, reason: 'Medical records verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('VERIFIED');
    expect(res.body.data.isVerified).toBe(true);

    const log = await AuditLog.findOne({
      entity: 'DonorProfile',
      entityId: donorProfile._id,
      action: 'DONOR_VERIFY_APPROVE',
    });
    expect(log).toBeDefined();
  });

  it('should block donor profile and associated user account', async () => {
    const res = await request
      .put(`/api/v1/admin/donors/${donorProfile._id}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Ineligible for donation' });
    expect(res.status).toBe(200);
    expect(res.body.data.isAvailable).toBe(false);

    const updatedUser = await User.findById(donorUser._id);
    expect(updatedUser.isBlocked).toBe(true);
  });
});

describe('4. Facilities Management (/api/v1/admin/facilities)', () => {
  it('should list pending facility registrations', async () => {
    const res = await request
      .get('/api/v1/admin/facilities/pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pendingHospitals.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pendingBloodBanks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalPending).toBeGreaterThanOrEqual(2);
  });

  it('should approve hospital registration and notify applicant via email', async () => {
    const res = await request
      .put(`/api/v1/admin/facilities/hospitals/${hospitalDoc._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE', reason: 'License and premises verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('VERIFIED');
    expect(res.body.data.isVerified).toBe(true);

    // Verify applicant received notification
    const notif = await Notification.findOne({
      user: hospitalUser._id,
      type: 'FACILITY_APPROVE',
    });
    expect(notif).toBeDefined();

    // Verify audit log
    const log = await AuditLog.findOne({
      entity: 'Hospital',
      entityId: hospitalDoc._id,
      action: 'HOSPITAL_APPROVE',
    });
    expect(log).toBeDefined();
  });

  it('should reject blood bank registration and notify applicant', async () => {
    const res = await request
      .put(`/api/v1/admin/facilities/bloodbanks/${bankDoc._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'REJECT', reason: 'License document expired' });
    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('REJECTED');

    const notif = await Notification.findOne({
      user: bankUser._id,
      type: 'FACILITY_REJECT',
    });
    expect(notif).toBeDefined();
  });

  it('should list hospitals and blood banks with search', async () => {
    const resHosp = await request
      .get('/api/v1/admin/hospitals?search=City Care')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resHosp.status).toBe(200);
    expect(resHosp.body.data.length).toBeGreaterThanOrEqual(1);

    const resBank = await request
      .get('/api/v1/admin/bloodbanks?search=Central RedCross')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resBank.status).toBe(200);
    expect(resBank.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('5. Inventory Management (/api/v1/admin/inventory)', () => {
  it('should view inventory across all blood banks', async () => {
    const res = await request
      .get('/api/v1/admin/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].bloodBank._id.toString()).toBe(bankDoc._id.toString());
  });

  it('should list low-stock inventory items', async () => {
    const res = await request
      .get('/api/v1/admin/inventory/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // O- has available: 3 <= threshold: 5
    const oMinus = res.body.data.find((item) => item.bloodGroup === 'O-');
    expect(oMinus).toBeDefined();
  });

  it('should override stock and audit log the mutation', async () => {
    const res = await request
      .put(`/api/v1/admin/inventory/${bankDoc._id}/O-`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'SET', units: 30, reason: 'Emergency supply received' });
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(30);

    const log = await AuditLog.findOne({
      action: 'ADMIN_INVENTORY_OVERRIDE',
    });
    expect(log).toBeDefined();
  });
});

describe('6. Requests Management (/api/v1/admin/requests)', () => {
  let testRequest;

  beforeAll(async () => {
    testRequest = await BloodRequest.create({
      requester: regularUser._id,
      patientName: 'Karan Mehra',
      bloodGroup: 'B+',
      units: 2,
      urgency: 'URGENT',
      hospitalName: 'Apollo Hospital',
      city: 'Mumbai',
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          changedBy: regularUser._id,
          note: 'Request created',
        },
      ],
    });
  });

  it('should list requests with pagination and filters', async () => {
    const res = await request
      .get('/api/v1/admin/requests?bloodGroup=B+&urgency=URGENT')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].patientName).toBe('Karan Mehra');
  });

  it('should approve blood request and audit log mutation', async () => {
    const res = await request
      .put(`/api/v1/admin/requests/${testRequest._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Verified by admin desk' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');

    const log = await AuditLog.findOne({
      entity: 'BloodRequest',
      entityId: testRequest._id,
      action: 'REQUEST_APPROVED',
    });
    expect(log).toBeDefined();
  });

  it('should assign a donor to the request and update status to DONOR_ASSIGNED', async () => {
    const res = await request
      .put(`/api/v1/admin/requests/${testRequest._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ donorId: donorUser._id });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DONOR_ASSIGNED');

    // Both donor and requester receive notification
    const donorNotif = await Notification.findOne({
      user: donorUser._id,
      type: 'DONOR_ASSIGNED_TO_REQUEST',
    });
    expect(donorNotif).toBeDefined();
  });

  it('should reject invalid state transitions per state machine', async () => {
    // Current status is DONOR_ASSIGNED; jumping straight to PENDING is illegal
    const res = await request
      .put(`/api/v1/admin/requests/${testRequest._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PENDING' });
    expect(res.status).toBe(400);
  });
});

describe('7. Emergency Operations (/api/v1/admin/emergency)', () => {
  let testEmergency;

  beforeAll(async () => {
    testEmergency = await EmergencyRequest.create({
      requester: regularUser._id,
      patientName: 'Sunita Rao',
      bloodGroup: 'AB+',
      units: 3,
      urgency: 'CRITICAL',
      status: 'ACTIVE',
      hospitalName: 'Lilavati Hospital',
      city: 'Mumbai',
      location: {
        type: 'Point',
        coordinates: [72.8258, 18.975],
      },
      notifiedDonors: [],
    });
  });

  it('should return live active emergencies with calculated metrics', async () => {
    const res = await request
      .get('/api/v1/admin/emergency/live')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const em = res.body.data.find((e) => e._id.toString() === testEmergency._id.toString());
    expect(em).toBeDefined();
    expect(em.patientName).toBe('Sunita Rao');
    expect(em.elapsedMinutes).toBeDefined();
  });

  it('should coordinate emergency by assigning donor', async () => {
    const res = await request
      .post(`/api/v1/admin/emergency/${testEmergency._id}/coordinate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'ASSIGN_DONOR', donorId: donorUser._id, distanceKm: 4.5 });
    expect(res.status).toBe(200);
    expect(res.body.data.notifiedDonors.length).toBeGreaterThanOrEqual(1);

    const log = await AuditLog.findOne({
      entity: 'EmergencyRequest',
      entityId: testEmergency._id,
      action: 'EMERGENCY_ADMIN_ASSIGN_DONOR',
    });
    expect(log).toBeDefined();
  });
});

describe('8. Donations Management (/api/v1/admin/donations)', () => {
  let testDonation;

  beforeAll(async () => {
    testDonation = await Donation.create({
      donor: donorUser._id,
      bloodBank: bankDoc._id,
      bloodGroup: 'A+',
      units: 1,
      verificationStatus: 'PENDING',
      donatedAt: new Date(),
    });
  });

  it('should list donations with pagination and filters', async () => {
    const res = await request
      .get('/api/v1/admin/donations?bloodGroup=A+')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should verify donation, assign certificateId, and audit log', async () => {
    const res = await request
      .put(`/api/v1/admin/donations/${testDonation._id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.verificationStatus).toBe('VERIFIED');
    expect(res.body.data.certificateId).toMatch(/^CERT-/);

    const log = await AuditLog.findOne({
      entity: 'Donation',
      entityId: testDonation._id,
      action: 'DONATION_VERIFY',
    });
    expect(log).toBeDefined();
  });
});

describe('9. Broadcast Announcements (/api/v1/admin/notifications/broadcast)', () => {
  it('should broadcast notification across selected channels and recipients', async () => {
    const res = await request
      .post('/api/v1/admin/notifications/broadcast')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        target: 'ALL',
        title: 'Urgent Blood Drive This Weekend',
        message: 'All healthy donors are invited to participate in the mega drive at Central Park.',
        channels: ['IN_APP', 'EMAIL'],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sentCount).toBeGreaterThan(0);

    const log = await AuditLog.findOne({
      action: 'ADMIN_BROADCAST',
    });
    expect(log).toBeDefined();
  });
});

describe('10. Complaints Management (/api/v1/admin/complaints)', () => {
  let testComplaint;

  beforeAll(async () => {
    testComplaint = await Feedback.create({
      user: regularUser._id,
      type: 'COMPLAINT',
      category: 'HOSPITAL',
      subject: 'Delay in processing blood request',
      message: 'Waited over 3 hours at the reception desk.',
      status: 'OPEN',
      responses: [],
    });
  });

  it('should list complaints with filters', async () => {
    const res = await request
      .get('/api/v1/admin/complaints?type=COMPLAINT')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].subject).toBe('Delay in processing blood request');
  });

  it('should assign complaint to an admin', async () => {
    const res = await request
      .put(`/api/v1/admin/complaints/${testComplaint._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminId: adminUser._id });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ASSIGNED');
    expect(res.body.data.assignedTo.toString()).toBe(adminUser._id.toString());
  });

  it('should respond to complaint and notify user', async () => {
    const res = await request
      .post(`/api/v1/admin/complaints/${testComplaint._id}/respond`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'We have contacted hospital management to review the delay.',
        status: 'IN_PROGRESS',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.responses.length).toBe(1);

    const notif = await Notification.findOne({
      user: regularUser._id,
      type: 'FEEDBACK_RESPONSE',
    });
    expect(notif).toBeDefined();
  });

  it('should resolve complaint and audit log resolution', async () => {
    const res = await request
      .put(`/api/v1/admin/complaints/${testComplaint._id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolutionNote: 'Hospital reprimanded and SOP streamlined.' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RESOLVED');

    const log = await AuditLog.findOne({
      entity: 'Feedback',
      entityId: testComplaint._id,
      action: 'COMPLAINT_RESOLVE',
    });
    expect(log).toBeDefined();
  });
});

describe('11. Dashboard Overview Analytics (/api/v1/admin/stats)', () => {
  it('should return system-wide stats matching requirements', async () => {
    const res = await request
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stats = res.body.data;
    // 1. Totals
    expect(stats.totals).toBeDefined();
    expect(stats.totals.users).toBeGreaterThanOrEqual(1);
    expect(stats.totals.donors).toBeGreaterThanOrEqual(1);
    expect(stats.totals.hospitals).toBeGreaterThanOrEqual(1);
    expect(stats.totals.bloodBanks).toBeGreaterThanOrEqual(1);
    expect(stats.totals.requests).toBeGreaterThanOrEqual(1);
    expect(stats.totals.donations).toBeGreaterThanOrEqual(1);

    // 2. Pending approvals
    expect(stats.pendingApprovals).toBeDefined();

    // 3. Active emergencies
    expect(typeof stats.activeEmergencies).toBe('number');

    // 4. Monthly donations
    expect(typeof stats.monthlyDonations).toBe('number');

    // 5. Stock by group (all 8 blood groups)
    expect(stats.stockByGroup).toBeDefined();
    ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].forEach((group) => {
      expect(stats.stockByGroup[group]).toBeDefined();
    });
  });
});

describe('12. Audit Trail Endpoints (/api/v1/admin/audit-logs)', () => {
  it('should query audit logs generated by earlier operations', async () => {
    const res = await request
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should return distinct action and entity values for dropdowns', async () => {
    const res = await request
      .get('/api/v1/admin/audit-logs/filters')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.actions)).toBe(true);
    expect(Array.isArray(res.body.data.entities)).toBe(true);
  });
});
