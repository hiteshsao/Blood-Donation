/**
 * Feedback & Complaint Management Integration Test Suite (/api/v1/feedback)
 *
 * Tests:
 * 1. POST / (submit feedback or complaint with validation & initial notifications)
 * 2. GET /my (paginated user submissions with type & status filtering)
 * 3. GET /:id (access control & full conversation thread with admin responses)
 * 4. POST /:id/reply (user follow-ups & admin responses with automatic user notifications)
 * 5. PUT /:id/status (admin status updates, resolutions & user notifications)
 * 6. Security: data isolation and authorization checks
 */

import http from 'http';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User, Feedback, Notification } from '../src/models/index.js';
import feedbackRoutes from '../src/routes/feedback.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { initSocket } from '../src/config/socket.js';

let mongoServer;
let app;
let server;
let request;

let userA;
let tokenA;

let userB;
let tokenB;

let adminUser;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount feedback routes
  app.use('/api/v1/feedback', feedbackRoutes);

  // Error handling middleware for tests
  app.use((err, req, res, next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });

  server = http.createServer(app);
  initSocket(server);
  request = supertest(app);

  // 1. Seed User A
  userA = await User.create({
    name: 'Priya Donor',
    email: 'priya.donor@test.com',
    phone: '9844444441',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    bloodGroup: 'B+',
    isEmailVerified: true,
  });
  tokenA = generateTokens(userA).accessToken;

  // 2. Seed User B
  userB = await User.create({
    name: 'Amit Requester',
    email: 'amit.requester@test.com',
    phone: '9844444442',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    bloodGroup: 'O+',
    isEmailVerified: true,
  });
  tokenB = generateTokens(userB).accessToken;

  // 3. Seed System Admin
  adminUser = await User.create({
    name: 'Super Admin',
    email: 'admin.support@test.com',
    phone: '9844444443',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  adminToken = generateTokens(adminUser).accessToken;
}, 60000);

afterAll(async () => {
  if (server) server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Feedback.deleteMany({});
  await Notification.deleteMany({});
});

describe('1. POST /api/v1/feedback (Submission & Validation)', () => {
  it('should submit positive feedback with rating', async () => {
    const res = await request
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        type: 'FEEDBACK',
        category: 'DONATION_EXPERIENCE',
        subject: 'Seamless appointment check-in',
        message: 'The staff was courteous and procedure was completed in 15 minutes.',
        rating: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback).toBeDefined();
    expect(res.body.feedback.type).toBe('FEEDBACK');
    expect(res.body.feedback.subject).toBe('Seamless appointment check-in');
    expect(res.body.feedback.rating).toBe(5);
    expect(res.body.feedback.status).toBe('OPEN');

    // User receives in-app submission acknowledgment
    const notif = await Notification.findOne({
      user: userA._id,
      type: 'FEEDBACK_SUBMITTED',
    });
    expect(notif).not.toBeNull();
    expect(notif.title).toContain('Feedback Received');
  });

  it('should submit a complaint ticket', async () => {
    const res = await request
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        type: 'COMPLAINT',
        category: 'DELAY',
        subject: 'Long waiting time at counter',
        message: 'Waited more than 45 minutes despite having a confirmed appointment.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback.type).toBe('COMPLAINT');
    expect(res.body.feedback.status).toBe('OPEN');

    // User receives complaint registered notification
    const notif = await Notification.findOne({
      user: userB._id,
      type: 'COMPLAINT_REGISTERED',
    });
    expect(notif).not.toBeNull();
    expect(notif.title).toContain('Complaint Registered');
  });

  it('should reject submission with missing subject/title with 400 Bad Request', async () => {
    const res = await request
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: 'Missing subject message',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Subject or title is required');
  });

  it('should reject submission with missing message with 400 Bad Request', async () => {
    const res = await request
      .post('/api/v1/feedback')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        subject: 'Subject without message',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Message or description is required');
  });

  it('should reject unauthenticated request with 401 Unauthorized', async () => {
    const res = await request.post('/api/v1/feedback').send({
      subject: 'Test',
      message: 'Test message',
    });

    expect(res.status).toBe(401);
  });
});

describe('2. GET /api/v1/feedback/my (Paginated User Submissions)', () => {
  beforeEach(async () => {
    // Seed 3 items for User A (2 feedbacks, 1 complaint)
    await Feedback.create([
      {
        user: userA._id,
        type: 'FEEDBACK',
        subject: 'A Feedback 1',
        message: 'Message 1',
        status: 'OPEN',
      },
      {
        user: userA._id,
        type: 'FEEDBACK',
        subject: 'A Feedback 2',
        message: 'Message 2',
        status: 'RESOLVED',
      },
      {
        user: userA._id,
        type: 'COMPLAINT',
        subject: 'A Complaint 1',
        message: 'Complaint message',
        status: 'OPEN',
      },
    ]);

    // Seed 1 item for User B
    await Feedback.create({
      user: userB._id,
      type: 'COMPLAINT',
      subject: 'B Private Complaint',
      message: 'Private message for B',
      status: 'OPEN',
    });
  });

  it('should return paginated list of own submissions without leaking other users items', async () => {
    const res = await request
      .get('/api/v1/feedback/my?page=1&limit=10')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.items.length).toBe(3);
    expect(res.body.pagination.total).toBe(3);

    // Ensure User B's complaint is not present
    const subjects = res.body.items.map((i) => i.subject);
    expect(subjects).not.toContain('B Private Complaint');
  });

  it('should filter by type (COMPLAINT)', async () => {
    const res = await request
      .get('/api/v1/feedback/my?type=COMPLAINT')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].type).toBe('COMPLAINT');
  });

  it('should filter by status (RESOLVED)', async () => {
    const res = await request
      .get('/api/v1/feedback/my?status=RESOLVED')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].status).toBe('RESOLVED');
  });
});

describe('3. GET /api/v1/feedback/:id (Thread Details & Access Control)', () => {
  let ticketA;

  beforeEach(async () => {
    ticketA = await Feedback.create({
      user: userA._id,
      type: 'COMPLAINT',
      subject: 'App Crashing on Search',
      message: 'App crashes whenever I filter by AB- blood group.',
      status: 'OPEN',
      responses: [
        {
          responder: adminUser._id,
          role: 'ADMIN',
          message: 'Thank you for reporting. Our engineering team is investigating.',
          respondedAt: new Date(),
        },
      ],
    });
  });

  it('should allow author to retrieve ticket with full response history', async () => {
    const res = await request
      .get(`/api/v1/feedback/${ticketA._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback._id.toString()).toBe(ticketA._id.toString());
    expect(res.body.feedback.responses.length).toBe(1);
    expect(res.body.feedback.responses[0].message).toContain('engineering team is investigating');
  });

  it('should allow Admin to view any feedback ticket', async () => {
    const res = await request
      .get(`/api/v1/feedback/${ticketA._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject another non-admin user with 403 Forbidden', async () => {
    const res = await request
      .get(`/api/v1/feedback/${ticketA._id}`)
      .set('Authorization', `Bearer ${tokenB}`); // User B tries to view User A's ticket

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not authorized to view this feedback ticket');
  });

  it('should return 404 for non-existent ticket ID', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request
      .get(`/api/v1/feedback/${fakeId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });
});

describe('4. POST /api/v1/feedback/:id/reply (Follow-ups & Admin Responses)', () => {
  let ticket;

  beforeEach(async () => {
    ticket = await Feedback.create({
      user: userA._id,
      type: 'COMPLAINT',
      subject: 'Missing Certificate',
      message: 'I did not receive my e-certificate after donation yesterday.',
      status: 'OPEN',
      responses: [],
    });
  });

  it('should allow user author to submit follow-up reply', async () => {
    const res = await request
      .post(`/api/v1/feedback/${ticket._id}/reply`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: 'Additional info: My donation registration ID was DON-8821.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback.responses.length).toBe(1);
    expect(res.body.feedback.responses[0].message).toContain('DON-8821');
    expect(res.body.feedback.responses[0].role).toBe('DONOR');
  });

  it('should allow Admin to reply and NOTIFY USER on admin response', async () => {
    const res = await request
      .post(`/api/v1/feedback/${ticket._id}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: 'We verified your donation record and regenerated your e-certificate.',
        statusChange: 'RESOLVED',
        resolutionNote: 'Certificate generated and emailed',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback.status).toBe('RESOLVED');
    expect(res.body.feedback.responses.length).toBe(1);

    // VERIFY USER WAS NOTIFIED
    const notif = await Notification.findOne({
      user: userA._id,
      type: 'FEEDBACK_RESPONSE',
    });

    expect(notif).not.toBeNull();
    expect(notif.title).toContain('Response on Your Complaint');
    expect(notif.message).toContain('regenerated your e-certificate');
    expect(notif.channels).toContain('IN_APP');
    expect(notif.channels).toContain('EMAIL');
  });

  it('should reject unauthorized user from replying to ticket with 403', async () => {
    const res = await request
      .post(`/api/v1/feedback/${ticket._id}/reply`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        message: 'Intruder reply',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not authorized to reply');
  });

  it('should reject empty message with 400 Bad Request', async () => {
    const res = await request
      .post(`/api/v1/feedback/${ticket._id}/reply`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        message: '   ',
      });

    expect(res.status).toBe(400);
    const hasErrMsg =
      res.body.message?.includes('Reply message is required') ||
      res.body.errors?.some((e) => e.message?.includes('Reply message is required'));
    expect(hasErrMsg).toBe(true);
  });
});

describe('5. PUT /api/v1/feedback/:id/status (Admin Status Updates)', () => {
  let ticket;

  beforeEach(async () => {
    ticket = await Feedback.create({
      user: userA._id,
      type: 'COMPLAINT',
      subject: 'Donor Card Issue',
      message: 'Wrong blood group printed on donor card.',
      status: 'OPEN',
    });
  });

  it('should allow Admin to update status and NOTIFY USER of status change', async () => {
    const res = await request
      .put(`/api/v1/feedback/${ticket._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNote: 'Corrected blood group in system and re-issued card',
        adminMessage: 'Card correction completed.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.feedback.status).toBe('RESOLVED');
    expect(res.body.feedback.resolvedAt).toBeDefined();

    // Verify user received status change notification
    const statusNotif = await Notification.findOne({
      user: userA._id,
      type: 'FEEDBACK_STATUS_CHANGED',
    });

    expect(statusNotif).not.toBeNull();
    expect(statusNotif.title).toContain('is now RESOLVED');
    expect(statusNotif.message).toContain('Corrected blood group');
  });

  it('should reject non-admin from updating status with 403 Forbidden', async () => {
    const res = await request
      .put(`/api/v1/feedback/${ticket._id}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        status: 'RESOLVED',
      });

    expect(res.status).toBe(403);
  });
});
