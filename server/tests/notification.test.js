/**
 * Notification Service & Endpoints Integration Test Suite (/api/v1/notifications)
 *
 * Tests:
 * 1. notify({ userId, type, title, message, channels: [IN_APP, EMAIL, SMS], meta })
 *    - IN_APP: saves to MongoDB + emits through Socket.io
 *    - EMAIL: nodemailer with LifeDrop HTML template
 *    - SMS: provider interface with MockSMSProvider & pluggable custom provider
 * 2. GET /api/v1/notifications (paginated, unread filter: ?unread=true)
 * 3. GET /api/v1/notifications/unread-count
 * 4. PUT /api/v1/notifications/:id/read
 * 5. PUT /api/v1/notifications/read-all
 * 6. DELETE /api/v1/notifications/:id
 * 7. Security & data isolation (users cannot read/delete other users' notifications)
 */

import http from 'http';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User, Notification } from '../src/models/index.js';
import notificationRoutes from '../src/routes/notification.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { initSocket } from '../src/config/socket.js';
import {
  notify,
  BaseSMSProvider,
  MockSMSProvider,
  setSMSProvider,
  getSMSProvider,
  buildNotificationHtml,
} from '../src/services/notification.service.js';

let mongoServer;
let app;
let server;
let request;

let userA;
let tokenA;

let userB;
let tokenB;

let mockSMS;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount notification routes
  app.use('/api/v1/notifications', notificationRoutes);

  // Initialize HTTP and Socket.io server
  server = http.createServer(app);
  initSocket(server);

  request = supertest(app);

  // Reset SMS provider to fresh MockSMSProvider
  mockSMS = new MockSMSProvider();
  setSMSProvider(mockSMS);

  // Seed User A
  userA = await User.create({
    name: 'Alice Donor',
    email: 'alice@example.com',
    phone: '9876543210',
    mobile: '9876543210',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    bloodGroup: 'O+',
    city: 'Mumbai',
    isEmailVerified: true,
  });
  tokenA = generateTokens(userA).accessToken;

  // Seed User B
  userB = await User.create({
    name: 'Bob Hospital Rep',
    email: 'bob@example.com',
    phone: '9876543211',
    mobile: '9876543211',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    bloodGroup: 'A+',
    city: 'Mumbai',
    isEmailVerified: true,
  });
  tokenB = generateTokens(userB).accessToken;
});

afterAll(async () => {
  if (server) {
    server.close();
  }
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Notification.deleteMany({});
  mockSMS.clearLog();
});

describe('1. Universal Notification Service: notify()', () => {
  it('should deliver across IN_APP, EMAIL, and SMS channels', async () => {
    const res = await notify({
      userId: userA._id,
      type: 'BLOOD_REQUEST_MATCH',
      title: 'Emergency Blood Needed',
      message: 'Urgent O+ units needed at City Care Hospital.',
      channels: ['IN_APP', 'EMAIL', 'SMS'],
      meta: {
        bloodGroup: 'O+',
        units: 2,
        hospitalName: 'City Care Hospital',
      },
    });

    expect(res.success).toBe(true);
    expect(res.delivery.inApp).toBe(true);
    expect(res.delivery.sms).toBe(true);

    // Verify IN_APP: DB record created
    const notifInDb = await Notification.findOne({ user: userA._id });
    expect(notifInDb).not.toBeNull();
    expect(notifInDb.title).toBe('Emergency Blood Needed');
    expect(notifInDb.type).toBe('BLOOD_REQUEST_MATCH');
    expect(notifInDb.channels).toContain('IN_APP');
    expect(notifInDb.channels).toContain('SMS');
    expect(notifInDb.channels).toContain('EMAIL');
    expect(notifInDb.isRead).toBe(false);
    expect(notifInDb.meta.bloodGroup).toBe('O+');

    // Verify SMS: logged in MockSMSProvider
    const smsLog = mockSMS.getLog();
    expect(smsLog.length).toBe(1);
    expect(smsLog[0].to).toBe('9876543210');
    expect(smsLog[0].message).toContain('Emergency Blood Needed');
  });

  it('should support plugging in a custom SMS provider (e.g. Twilio / MSG91)', async () => {
    class CustomTwilioProvider extends BaseSMSProvider {
      constructor() {
        super();
        this.dispatched = [];
      }
      async sendSMS({ to, message, meta }) {
        this.dispatched.push({ to, message, provider: 'TWILIO_MOCK' });
        return { success: true, messageId: 'TWILIO_MSG_999' };
      }
    }

    const customProvider = new CustomTwilioProvider();
    setSMSProvider(customProvider);
    expect(getSMSProvider()).toBe(customProvider);

    await notify({
      userId: userA._id,
      type: 'SMS_TEST',
      title: 'Appointment Confirmed',
      message: 'Your slot is confirmed for tomorrow 10:00 AM.',
      channels: ['SMS'],
    });

    expect(customProvider.dispatched.length).toBe(1);
    expect(customProvider.dispatched[0].to).toBe('9876543210');
    expect(customProvider.dispatched[0].provider).toBe('TWILIO_MOCK');

    // Restore standard mock provider
    setSMSProvider(mockSMS);
  });

  it('should generate professional HTML email template via buildNotificationHtml', () => {
    const html = buildNotificationHtml({
      title: 'Donation Appointment Confirmed',
      message: 'Thank you for scheduling a blood donation appointment.',
      meta: {
        Date: '2026-10-15',
        Time: '10:30 AM',
        Location: 'Central Blood Bank',
      },
      userName: 'Alice Donor',
    });

    expect(html).toContain('LifeDrop');
    expect(html).toContain('Donation Appointment Confirmed');
    expect(html).toContain('Alice Donor');
    expect(html).toContain('Central Blood Bank');
    expect(html).toContain('10:30 AM');
  });

  it('should handle missing recipient phone gracefully for SMS channel without throwing', async () => {
    const randomUserId = new mongoose.Types.ObjectId();

    const res = await notify({
      userId: randomUserId,
      type: 'INFO',
      title: 'Notification Test',
      message: 'Testing fallback when no phone exists.',
      channels: ['IN_APP', 'SMS'],
    });

    expect(res.success).toBe(true);
    expect(res.delivery.inApp).toBe(true);
    expect(res.delivery.sms).toBe(false); // phone missing
  });
});

describe('2. GET /api/v1/notifications', () => {
  beforeEach(async () => {
    // Seed 4 notifications for User A (2 read, 2 unread)
    await Notification.create([
      {
        user: userA._id,
        type: 'REQUEST_UPDATE',
        title: 'Request Update 1 (Unread)',
        message: 'First unread update',
        isRead: false,
        channels: ['IN_APP'],
        createdAt: new Date(Date.now() - 4000),
      },
      {
        user: userA._id,
        type: 'REQUEST_UPDATE',
        title: 'Request Update 2 (Read)',
        message: 'First read update',
        isRead: true,
        readAt: new Date(),
        channels: ['IN_APP'],
        createdAt: new Date(Date.now() - 3000),
      },
      {
        user: userA._id,
        type: 'REQUEST_UPDATE',
        title: 'Request Update 3 (Unread)',
        message: 'Second unread update',
        isRead: false,
        channels: ['IN_APP'],
        createdAt: new Date(Date.now() - 2000),
      },
      {
        user: userA._id,
        type: 'REQUEST_UPDATE',
        title: 'Request Update 4 (Read)',
        message: 'Second read update',
        isRead: true,
        readAt: new Date(),
        channels: ['IN_APP'],
        createdAt: new Date(Date.now() - 1000),
      },
    ]);

    // Seed 1 notification for User B (data isolation check)
    await Notification.create({
      user: userB._id,
      type: 'HOSPITAL_ALERT',
      title: 'Hospital Alert for Bob',
      message: 'Private message for Bob',
      isRead: false,
      channels: ['IN_APP'],
    });
  });

  it('should return paginated list of notifications for the authenticated user only', async () => {
    const res = await request
      .get('/api/v1/notifications?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notifications.length).toBe(2);
    expect(res.body.pagination.total).toBe(4);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.unreadCount).toBe(2);

    // Make sure User B's notification is not returned
    const titles = res.body.notifications.map((n) => n.title);
    expect(titles).not.toContain('Hospital Alert for Bob');
  });

  it('should filter only unread notifications when unread=true is supplied', async () => {
    const res = await request
      .get('/api/v1/notifications?unread=true')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notifications.length).toBe(2);
    expect(res.body.notifications.every((n) => n.isRead === false)).toBe(true);
  });

  it('should reject unauthenticated request with 401', async () => {
    const res = await request.get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });
});

describe('3. GET /api/v1/notifications/unread-count', () => {
  it('should return the accurate unread count for badge indicators', async () => {
    // Seed 3 unread and 1 read
    await Notification.create([
      { user: userA._id, type: 'ALERT', title: 'Notif 1', message: 'msg', isRead: false },
      { user: userA._id, type: 'ALERT', title: 'Notif 2', message: 'msg', isRead: false },
      { user: userA._id, type: 'ALERT', title: 'Notif 3', message: 'msg', isRead: false },
      { user: userA._id, type: 'ALERT', title: 'Notif 4', message: 'msg', isRead: true },
    ]);

    const res = await request
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
  });
});

describe('4. PUT /api/v1/notifications/:id/read', () => {
  it('should mark a specific notification as read', async () => {
    const notif = await Notification.create({
      user: userA._id,
      type: 'INFO',
      title: 'Mark as read test',
      message: 'Please mark this as read',
      isRead: false,
    });

    const res = await request
      .put(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notification.isRead).toBe(true);

    const updated = await Notification.findById(notif._id);
    expect(updated.isRead).toBe(true);
  });

  it('should reject marking another user notification with 404', async () => {
    const bobNotif = await Notification.create({
      user: userB._id,
      type: 'INFO',
      title: 'Bob Notif',
      message: 'Bob message',
      isRead: false,
    });

    const res = await request
      .put(`/api/v1/notifications/${bobNotif._id}/read`)
      .set('Authorization', `Bearer ${tokenA}`); // Alice tries to read Bob's notif

    expect(res.status).toBe(404);
  });
});

describe('5. PUT /api/v1/notifications/read-all', () => {
  it('should mark all unread notifications of the logged-in user as read', async () => {
    await Notification.create([
      { user: userA._id, type: 'UPDATE', title: 'N1', message: 'm1', isRead: false },
      { user: userA._id, type: 'UPDATE', title: 'N2', message: 'm2', isRead: false },
      { user: userB._id, type: 'UPDATE', title: 'Bob N1', message: 'bm1', isRead: false },
    ]);

    const res = await request
      .put('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.modifiedCount).toBe(2);

    // Alice has 0 unread now
    const aliceUnread = await Notification.countDocuments({ user: userA._id, isRead: false });
    expect(aliceUnread).toBe(0);

    // Bob still has 1 unread
    const bobUnread = await Notification.countDocuments({ user: userB._id, isRead: false });
    expect(bobUnread).toBe(1);
  });
});

describe('6. DELETE /api/v1/notifications/:id', () => {
  it('should delete a notification belonging to the user', async () => {
    const notif = await Notification.create({
      user: userA._id,
      type: 'INFO',
      title: 'To Be Deleted',
      message: 'This will be deleted',
    });

    const res = await request
      .delete(`/api/v1/notifications/${notif._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await Notification.findById(notif._id);
    expect(check).toBeNull();
  });

  it('should reject deleting another user notification with 404', async () => {
    const bobNotif = await Notification.create({
      user: userB._id,
      type: 'INFO',
      title: 'Bob Private',
      message: 'Cannot be deleted by Alice',
    });

    const res = await request
      .delete(`/api/v1/notifications/${bobNotif._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);

    const check = await Notification.findById(bobNotif._id);
    expect(check).not.toBeNull();
  });
});
