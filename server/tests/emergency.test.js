/**
 * Emergency Blood Request API & Auto-matching Integration Tests (/api/v1/emergency)
 *
 * Tests:
 * - POST / (creates emergency, auto-matches compatible verified eligible donors, in-app + email + socket notifications)
 * - GET /nearby (donor retrieves pending emergencies matching their blood group compatibility)
 * - POST /:id/respond (ACCEPTED / REJECTED responses)
 * - Auto-mark FULFILLED when accepted donors >= units needed
 * - GET /:id/progress (units needed vs accepted, donor breakdown)
 * - Auto-escalation (radius expansion, finding newly reachable donors, re-notifying)
 * - Socket.io with JWT auth on connection & user:<id> rooms
 */
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  DonorProfile,
  Hospital,
  EmergencyRequest,
  Notification,
} from '../src/models/index.js';
import emergencyRoutes from '../src/routes/emergency.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import {
  socketAuthMiddleware,
  handleSocketConnection,
} from '../src/config/socket.js';
import {
  RECIPIENT_COMPATIBILITY_MAP,
  DONOR_COMPATIBILITY_MAP,
} from '../src/services/emergency.service.js';

let mongoServer;
let request;

let requesterUser;
let requesterToken;

let compatibleDonorUser1; // O- donor (Universal) in Mumbai (~2km)
let compatibleDonorToken1;

let compatibleDonorUser2; // O+ donor in Mumbai (~5km)
let compatibleDonorToken2;

let incompatibleDonorUser; // B+ donor in Mumbai
let incompatibleDonorToken;

let distantDonorUser; // O- donor in outer region (~25km, for escalation test)
let distantDonorToken;

let testHospital;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/v1/emergency', emergencyRoutes);
  app.use((err, req, res, next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });

  request = supertest(app);

  await DonorProfile.init();
  await EmergencyRequest.init();

  // ── 1. Seed Requester ──
  requesterUser = await User.create({
    name: 'ICU Doctor',
    email: 'icu.doctor@test.com',
    phone: '9876543100',
    mobile: '9876543100',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'HOSPITAL',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.8777, 19.076] }, // Mumbai center
  });
  requesterToken = generateTokens(requesterUser).accessToken;

  testHospital = await Hospital.create({
    user: requesterUser._id,
    createdBy: requesterUser._id,
    name: 'Lilavati Hospital & Research Centre',
    licenseNumber: 'HOSP-LIL-001',
    city: 'Mumbai',
    verificationStatus: 'VERIFIED',
    isVerified: true,
  });

  // ── 2. Seed Compatible Donor 1: O- (Universal donor, ~2 km away) ──
  compatibleDonorUser1 = await User.create({
    name: 'Universal Donor O Negative',
    email: 'donor.oneg@test.com',
    phone: '9876543101',
    mobile: '9876543101',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    bloodGroup: 'O-',
    gender: 'MALE',
    dob: new Date('1994-06-15'),
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.885, 19.082] }, // ~1.5 km
  });
  compatibleDonorToken1 = generateTokens(compatibleDonorUser1).accessToken;

  await DonorProfile.create({
    user: compatibleDonorUser1._id,
    bloodGroup: 'O-',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    weight: 70,
    dob: new Date('1994-06-15'),
    nextEligibleDate: new Date(Date.now() - 86400000), // eligible
    location: { type: 'Point', coordinates: [72.885, 19.082] },
  });

  // ── 3. Seed Compatible Donor 2: O+ (Compatible for O+ emergency, ~4 km away) ──
  compatibleDonorUser2 = await User.create({
    name: 'Donor O Positive',
    email: 'donor.opos@test.com',
    phone: '9876543102',
    mobile: '9876543102',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    bloodGroup: 'O+',
    gender: 'FEMALE',
    dob: new Date('1996-08-20'),
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.895, 19.09] }, // ~3.5 km
  });
  compatibleDonorToken2 = generateTokens(compatibleDonorUser2).accessToken;

  await DonorProfile.create({
    user: compatibleDonorUser2._id,
    bloodGroup: 'O+',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    weight: 62,
    dob: new Date('1996-08-20'),
    nextEligibleDate: new Date(Date.now() - 86400000),
    location: { type: 'Point', coordinates: [72.895, 19.09] },
  });

  // ── 4. Seed Incompatible Donor: B+ (Incompatible for O+ emergency, ~2 km away) ──
  incompatibleDonorUser = await User.create({
    name: 'Donor B Positive',
    email: 'donor.bpos@test.com',
    phone: '9876543103',
    mobile: '9876543103',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    bloodGroup: 'B+',
    gender: 'MALE',
    dob: new Date('1993-01-10'),
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });
  incompatibleDonorToken = generateTokens(incompatibleDonorUser).accessToken;

  await DonorProfile.create({
    user: incompatibleDonorUser._id,
    bloodGroup: 'B+',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    weight: 65,
    dob: new Date('1993-01-10'),
    nextEligibleDate: new Date(Date.now() - 86400000),
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });

  // ── 5. Seed Distant Compatible Donor: O- in outer region (~25 km away) ──
  distantDonorUser = await User.create({
    name: 'Distant O- Donor',
    email: 'donor.distant@test.com',
    phone: '9876543104',
    mobile: '9876543104',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    bloodGroup: 'O-',
    city: 'Thane',
    location: { type: 'Point', coordinates: [72.978, 19.218] }, // ~25 km from Mumbai center
  });
  distantDonorToken = generateTokens(distantDonorUser).accessToken;

  await DonorProfile.create({
    user: distantDonorUser._id,
    bloodGroup: 'O-',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    weight: 75,
    dob: new Date('1991-04-12'),
    nextEligibleDate: new Date(Date.now() - 86400000),
    location: { type: 'Point', coordinates: [72.978, 19.218] },
  });
}, 180000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}, 15000);

// ─────────────────────────────────────────────────────────────────
// 1. BLOOD GROUP COMPATIBILITY ENGINE UNIT TEST
// ─────────────────────────────────────────────────────────────────
describe('Blood Group Compatibility Maps', () => {
  it('should correctly define recipient compatibility rules', () => {
    expect(RECIPIENT_COMPATIBILITY_MAP['O+']).toEqual(['O+', 'O-']);
    expect(RECIPIENT_COMPATIBILITY_MAP['O-']).toEqual(['O-']);
    expect(RECIPIENT_COMPATIBILITY_MAP['A+']).toContain('O-');
    expect(RECIPIENT_COMPATIBILITY_MAP['A+']).toContain('A+');
    expect(RECIPIENT_COMPATIBILITY_MAP['AB+']).toHaveLength(8); // Universal recipient
  });

  it('should correctly define donor compatibility rules', () => {
    expect(DONOR_COMPATIBILITY_MAP['O-']).toHaveLength(8); // Universal donor can give to all
    expect(DONOR_COMPATIBILITY_MAP['O+']).toEqual(['O+', 'A+', 'B+', 'AB+']);
    expect(DONOR_COMPATIBILITY_MAP['AB+']).toEqual(['AB+']);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. POST /api/v1/emergency (Creation & Auto-Matching)
// ─────────────────────────────────────────────────────────────────
describe('POST /api/v1/emergency', () => {
  let createdEmergencyId;

  it('should create emergency request and auto-match only compatible, eligible, nearby donors', async () => {
    // Request for O+ blood in Mumbai with 10 km radius
    const res = await request
      .post('/api/v1/emergency')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        bloodGroup: 'O+',
        units: 2,
        patientName: 'Trauma Victim',
        city: 'Mumbai',
        radiusKm: 10,
        notes: 'Massive blood loss in ICU',
        location: { lat: 19.076, lng: 72.8777 },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.emergency).toBeDefined();
    expect(res.body.emergency.status).toBe('ACTIVE');
    expect(res.body.emergency.bloodGroup).toBe('O+');
    expect(res.body.emergency.units).toBe(2);

    createdEmergencyId = res.body.emergency._id;

    // Matched donors count:
    // Should match O- donor (~1.5km) and O+ donor (~3.5km) within 10km.
    // Incompatible B+ donor and distant Thane donor (~25km) MUST be excluded!
    expect(res.body.matchedDonorsCount).toBe(2);

    const notifiedDonors = res.body.emergency.notifiedDonors;
    expect(notifiedDonors.length).toBe(2);
    const notifiedUserIds = notifiedDonors.map((n) => n.donor.toString());

    expect(notifiedUserIds).toContain(compatibleDonorUser1._id.toString());
    expect(notifiedUserIds).toContain(compatibleDonorUser2._id.toString());
    expect(notifiedUserIds).not.toContain(incompatibleDonorUser._id.toString());
    expect(notifiedUserIds).not.toContain(distantDonorUser._id.toString());

    // In-app notifications generated
    const notif1 = await Notification.findOne({
      user: compatibleDonorUser1._id,
      type: 'EMERGENCY_ALERT',
    });
    expect(notif1).not.toBeNull();
    expect(notif1.title).toContain('EMERGENCY');
    expect(notif1.meta.emergencyId.toString()).toBe(createdEmergencyId.toString());

    const notifIncompatible = await Notification.findOne({
      user: incompatibleDonorUser._id,
      type: 'EMERGENCY_ALERT',
    });
    expect(notifIncompatible).toBeNull();
  });

  it('should reject invalid bloodGroup with 400', async () => {
    const res = await request
      .post('/api/v1/emergency')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        bloodGroup: 'INVALID',
        units: 1,
      });

    expect(res.status).toBe(400);
  });

  it('should reject non-positive units with 400', async () => {
    const res = await request
      .post('/api/v1/emergency')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        bloodGroup: 'O+',
        units: 0,
      });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. GET /api/v1/emergency/nearby (Donor Discovery)
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/emergency/nearby', () => {
  let emergencyDoc;

  beforeAll(async () => {
    emergencyDoc = await EmergencyRequest.create({
      requester: requesterUser._id,
      patientName: 'Nearby Discovery Test',
      bloodGroup: 'A+',
      units: 1,
      city: 'Mumbai',
      status: 'ACTIVE',
      radiusKm: 15,
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notifiedDonors: [
        {
          donor: compatibleDonorUser1._id,
          response: 'PENDING',
          distanceKm: 2.0,
        },
      ],
    });
  });

  it('should return compatible active emergencies for authenticated donor', async () => {
    // compatibleDonorUser1 has bloodGroup 'O-', which can donate to 'A+'
    const res = await request
      .get('/api/v1/emergency/nearby')
      .set('Authorization', `Bearer ${compatibleDonorToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.emergencies)).toBe(true);
    const found = res.body.emergencies.find((e) => e._id === emergencyDoc._id.toString());
    expect(found).toBeDefined();
    expect(found.bloodGroup).toBe('A+');
    expect(found.donorResponse).toBe('PENDING');
  });

  it('should NOT return emergency if donor blood group is biologically incompatible', async () => {
    // incompatibleDonorUser has bloodGroup 'B+', which CANNOT donate to 'A+'
    const res = await request
      .get('/api/v1/emergency/nearby')
      .set('Authorization', `Bearer ${incompatibleDonorToken}`);

    expect(res.status).toBe(200);
    const found = res.body.emergencies.find((e) => e._id === emergencyDoc._id.toString());
    expect(found).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. POST /api/v1/emergency/:id/respond & AUTO-MARK FULFILLED
// ─────────────────────────────────────────────────────────────────
describe('POST /api/v1/emergency/:id/respond', () => {
  let singleUnitEmergency;
  let multiUnitEmergency;

  beforeAll(async () => {
    // Single unit emergency (1 unit required)
    singleUnitEmergency = await EmergencyRequest.create({
      requester: requesterUser._id,
      patientName: 'Single Unit Patient',
      bloodGroup: 'O+',
      units: 1,
      city: 'Mumbai',
      status: 'ACTIVE',
      radiusKm: 15,
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
      notifiedDonors: [
        {
          donor: compatibleDonorUser1._id,
          response: 'PENDING',
          distanceKm: 1.5,
        },
      ],
    });

    // Multi unit emergency (2 units required)
    multiUnitEmergency = await EmergencyRequest.create({
      requester: requesterUser._id,
      patientName: 'Multi Unit Patient',
      bloodGroup: 'O+',
      units: 2,
      city: 'Mumbai',
      status: 'ACTIVE',
      radiusKm: 15,
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
      notifiedDonors: [
        { donor: compatibleDonorUser1._id, response: 'PENDING', distanceKm: 1.5 },
        { donor: compatibleDonorUser2._id, response: 'PENDING', distanceKm: 3.5 },
      ],
    });
  });

  it('should record REJECTED response without fulfilling', async () => {
    const res = await request
      .post(`/api/v1/emergency/${multiUnitEmergency._id}/respond`)
      .set('Authorization', `Bearer ${compatibleDonorToken2}`)
      .send({ response: 'REJECTED' });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('REJECTED');
    expect(res.body.isFulfilled).toBe(false);

    const updated = await EmergencyRequest.findById(multiUnitEmergency._id);
    expect(updated.status).toBe('ACTIVE');
    const entry = updated.notifiedDonors.find(
      (n) => n.donor.toString() === compatibleDonorUser2._id.toString()
    );
    expect(entry.response).toBe('REJECTED');
  });

  it('should record ACCEPTED response and notify requester', async () => {
    const res = await request
      .post(`/api/v1/emergency/${multiUnitEmergency._id}/respond`)
      .set('Authorization', `Bearer ${compatibleDonorToken1}`)
      .send({ response: 'ACCEPTED' });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe('ACCEPTED');
    expect(res.body.acceptedCount).toBe(1);
    // Needs 2 units, only 1 accepted, so not fulfilled yet
    expect(res.body.isFulfilled).toBe(false);

    // Requester gets notified of donor acceptance
    const notif = await Notification.findOne({
      user: requesterUser._id,
      type: 'DONOR_ACCEPTED_EMERGENCY',
      'meta.emergencyId': multiUnitEmergency._id,
    });
    expect(notif).not.toBeNull();
  });

  it('should AUTO-MARK FULFILLED when accepted donors >= units needed', async () => {
    // singleUnitEmergency needs 1 unit. Donor 1 accepts -> should auto-fulfill!
    const res = await request
      .post(`/api/v1/emergency/${singleUnitEmergency._id}/respond`)
      .set('Authorization', `Bearer ${compatibleDonorToken1}`)
      .send({ response: 'ACCEPTED' });

    expect(res.status).toBe(200);
    expect(res.body.isFulfilled).toBe(true);
    expect(res.body.acceptedCount).toBe(1);
    expect(res.body.emergency.status).toBe('FULFILLED');

    // Verify DB record
    const updated = await EmergencyRequest.findById(singleUnitEmergency._id);
    expect(updated.status).toBe('FULFILLED');

    // Requester received fulfillment notification
    const fulfillmentNotif = await Notification.findOne({
      user: requesterUser._id,
      type: 'EMERGENCY_FULFILLED',
      'meta.emergencyId': singleUnitEmergency._id,
    });
    expect(fulfillmentNotif).not.toBeNull();
    expect(fulfillmentNotif.title).toContain('FULFILLED');
  });

  it('should reject responding to already FULFILLED emergency with 400', async () => {
    const res = await request
      .post(`/api/v1/emergency/${singleUnitEmergency._id}/respond`)
      .set('Authorization', `Bearer ${compatibleDonorToken2}`)
      .send({ response: 'ACCEPTED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already been fulfilled');
  });

  it('should reject invalid response string with 400', async () => {
    const res = await request
      .post(`/api/v1/emergency/${multiUnitEmergency._id}/respond`)
      .set('Authorization', `Bearer ${compatibleDonorToken1}`)
      .send({ response: 'MAYBE' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. GET /api/v1/emergency/:id/progress
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/emergency/:id/progress', () => {
  let progressEmergency;

  beforeAll(async () => {
    progressEmergency = await EmergencyRequest.create({
      requester: requesterUser._id,
      patientName: 'Progress Patient',
      bloodGroup: 'B+',
      units: 3,
      city: 'Mumbai',
      status: 'ACTIVE',
      radiusKm: 15,
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
      notifiedDonors: [
        {
          donor: compatibleDonorUser1._id,
          response: 'ACCEPTED',
          distanceKm: 2.1,
          respondedAt: new Date(),
        },
        {
          donor: compatibleDonorUser2._id,
          response: 'REJECTED',
          distanceKm: 3.8,
          respondedAt: new Date(),
        },
        {
          donor: incompatibleDonorUser._id,
          response: 'PENDING',
          distanceKm: 1.9,
        },
      ],
    });
  });

  it('should return units needed vs accepted and donor breakdown', async () => {
    const res = await request
      .get(`/api/v1/emergency/${progressEmergency._id}/progress`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const progress = res.body.progress;

    expect(progress.unitsNeeded).toBe(3);
    expect(progress.acceptedCount).toBe(1);
    expect(progress.rejectedCount).toBe(1);
    expect(progress.pendingCount).toBe(1);
    expect(progress.totalNotified).toBe(3);
    expect(progress.isFulfilled).toBe(false);
    expect(progress.status).toBe('ACTIVE');

    // Check accepted donors list
    expect(Array.isArray(progress.acceptedDonors)).toBe(true);
    expect(progress.acceptedDonors.length).toBe(1);
    expect(progress.acceptedDonors[0].name).toBe('Universal Donor O Negative');
    expect(progress.acceptedDonors[0].phone).toContain('**'); // Masked phone for privacy
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. AUTO-ESCALATION (Radius widening & re-notification)
// ─────────────────────────────────────────────────────────────────
describe('Emergency Auto-Escalation Engine', () => {
  let escalationEmergency;

  beforeAll(async () => {
    // Start with 10 km radius: distant donor (~25 km) is initially out of range
    escalationEmergency = await EmergencyRequest.create({
      requester: requesterUser._id,
      patientName: 'Escalation Patient',
      bloodGroup: 'O-',
      units: 2,
      city: 'Mumbai',
      status: 'ACTIVE',
      radiusKm: 10,
      initialRadiusKm: 10,
      escalationLevel: 0,
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
      notifiedDonors: [
        {
          donor: compatibleDonorUser1._id, // in range (~1.5km)
          response: 'PENDING',
          distanceKm: 1.5,
        },
      ],
    });
  });

  it('should widen search radius and notify newly reachable donors on escalation', async () => {
    const res = await request
      .post(`/api/v1/emergency/${escalationEmergency._id}/escalate`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.previousRadius).toBe(10);
    expect(res.body.newRadius).toBe(25); // 10 + 15 = 25 km

    // Distant donor (~25 km away in Thane) is now reachable and notified!
    expect(res.body.additionalDonorsCount).toBeGreaterThanOrEqual(1);

    const updated = await EmergencyRequest.findById(escalationEmergency._id);
    expect(updated.radiusKm).toBe(25);
    expect(updated.escalationLevel).toBe(1);

    const allNotifiedIds = updated.notifiedDonors.map((n) => n.donor.toString());
    expect(allNotifiedIds).toContain(distantDonorUser._id.toString());

    // Requester received escalation notification
    const notif = await Notification.findOne({
      user: requesterUser._id,
      type: 'EMERGENCY_ESCALATED',
    });
    expect(notif).not.toBeNull();
    expect(notif.message).toContain('25 km');
    expect(notif.meta.emergencyId.toString()).toBe(escalationEmergency._id.toString());
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. SOCKET.IO JWT AUTH & PER-USER ROOMS (user:<id>)
// ─────────────────────────────────────────────────────────────────
describe('Socket.io Connection & JWT Authentication', () => {
  it('should authenticate client with valid JWT and attach user', async () => {
    const mockSocket = {
      handshake: {
        auth: { token: compatibleDonorToken1 },
      },
    };
    let middlewareErr;
    await socketAuthMiddleware(mockSocket, (err) => {
      middlewareErr = err;
    });

    expect(middlewareErr).toBeUndefined();
    expect(mockSocket.user).toBeDefined();
    expect(mockSocket.user._id.toString()).toBe(compatibleDonorUser1._id.toString());

    // Test automatic per-user room joining
    const joinedRooms = [];
    mockSocket.join = (room) => joinedRooms.push(room);
    mockSocket.on = () => {};

    handleSocketConnection(mockSocket);
    expect(joinedRooms).toContain(`user:${compatibleDonorUser1._id.toString()}`);
  });

  it('should reject connection when invalid JWT is supplied', async () => {
    const mockSocket = {
      handshake: {
        auth: { token: 'invalid_garbage_token' },
      },
    };
    let middlewareErr;
    await socketAuthMiddleware(mockSocket, (err) => {
      middlewareErr = err;
    });

    expect(middlewareErr).toBeDefined();
    expect(middlewareErr.message).toContain('Authentication error');
  });

  it('should reject connection when no token is provided', async () => {
    const mockSocket = {
      handshake: {
        auth: {},
      },
    };
    let middlewareErr;
    await socketAuthMiddleware(mockSocket, (err) => {
      middlewareErr = err;
    });

    expect(middlewareErr).toBeDefined();
    expect(middlewareErr.message).toContain('token required');
  });
});
