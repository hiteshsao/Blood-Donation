/**
 * Profile & Donor API Integration Tests
 *
 * Uses Jest + Supertest + MongoMemoryServer.
 * Run: node --experimental-vm-modules node_modules/jest/bin/jest.js tests/profile-donor.test.js --runInBand
 */
import mongoose from 'mongoose';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Import models directly (no dynamic import needed)
import { User, DonorProfile, Donation, EligibilityRule, Notification } from '../src/models/index.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { checkDonorEligibility, resetEligibleDonorAvailability } from '../src/services/donor.service.js';

// Import routes
import profileRoutes from '../src/routes/profile.routes.js';
import donorRoutes from '../src/routes/donor.routes.js';

// Supertest
import supertest from 'supertest';

// ── Test App (no socket.io needed) ──
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/donor', donorRoutes);
app.use((err, req, res, next) => {
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(status).json({ success: false, message: err.message });
});

let mongoServer;
let request;
let testUser;
let accessToken;

// ─────────────────────────────────────────────────────────────────
// Setup / Teardown
// ─────────────────────────────────────────────────────────────────
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // Seed eligibility rule
  await EligibilityRule.create({
    ruleName: 'Test Rule',
    minAge: 18,
    maxAge: 65,
    minWeightKg: 50,
    minMaleGapDays: 90,
    minFemaleGapDays: 120,
    minHemoglobin: 12.5,
    isActive: true,
    isDefault: true,
  });

  // Seed test user
  testUser = await User.create({
    name: 'Test User',
    email: 'testuser@example.com',
    phone: '9876543210',
    mobile: '9876543210',
    password: 'TestPassword@123',
    passwordHash: 'TestPassword@123',
    role: 'USER',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    emailVerified: true,
    gender: 'MALE',
    dob: new Date('1995-06-15'),
    bloodGroup: 'O+',
  });

  const tokens = generateTokens(testUser);
  accessToken = tokens.accessToken;
}, 180000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}, 15000);

// ─────────────────────────────────────────────────────────────────
// PROFILE TESTS
// ─────────────────────────────────────────────────────────────────
describe('Profile API (/api/v1/profile)', () => {
  describe('GET /me', () => {
    it('should return 401 without token', async () => {
      const res = await request.get('/api/v1/profile/me');
      expect(res.status).toBe(401);
    });

    it('should return user profile with valid token', async () => {
      const res = await request
        .get('/api/v1/profile/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('testuser@example.com');
    });
  });

  describe('PUT /me', () => {
    it('should update name and mobile', async () => {
      const res = await request
        .put('/api/v1/profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name', mobile: '9876543211' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('should reject invalid blood group', async () => {
      const res = await request
        .put('/api/v1/profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bloodGroup: 'Z+' });
      expect(res.status).toBe(400);
    });

    it('should update emergency contact', async () => {
      const res = await request
        .put('/api/v1/profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          emergencyContact: {
            name: 'Emergency Person',
            relation: 'Spouse',
            phone: '9876543299',
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.user.emergencyContact.name).toBe('Emergency Person');
    });

    it('should update DOB and gender', async () => {
      const res = await request
        .put('/api/v1/profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dob: '1995-06-15', gender: 'MALE' });
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /address', () => {
    it('should update address with nested object', async () => {
      const res = await request
        .put('/api/v1/profile/address')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          address: { line: '42 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update location with lat/lng', async () => {
      const res = await request
        .put('/api/v1/profile/address')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          location: { lat: 19.076, lng: 72.8777 },
        });
      expect(res.status).toBe(200);
      expect(res.body.user.location.type).toBe('Point');
      expect(res.body.user.location.coordinates).toHaveLength(2);
    });

    it('should update location with GeoJSON format', async () => {
      const res = await request
        .put('/api/v1/profile/address')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          location: { type: 'Point', coordinates: [72.8777, 19.076] },
        });
      expect(res.status).toBe(200);
    });

    it('should reject invalid pincode', async () => {
      const res = await request
        .put('/api/v1/profile/address')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pincode: 'AB' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /become-donor', () => {
    it('should enrol user as donor', async () => {
      const res = await request
        .post('/api/v1/profile/become-donor')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bloodGroup: 'O+', weightKg: 72 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.donorProfile).toBeDefined();
      expect(res.body.donorProfile.bloodGroup).toBe('O+');
    });

    it('should reactivate existing donor profile', async () => {
      const res = await request
        .post('/api/v1/profile/become-donor')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bloodGroup: 'A+', weightKg: 75 });
      expect(res.status).toBe(201);
      expect(res.body.donorProfile.bloodGroup).toBe('A+');
    });

    it('should reject invalid weight', async () => {
      const res = await request
        .post('/api/v1/profile/become-donor')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bloodGroup: 'O+', weightKg: 10 });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /donor-toggle', () => {
    it('should toggle donor availability', async () => {
      const res = await request
        .put('/api/v1/profile/donor-toggle')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.isAvailable).toBe('boolean');
    });

    it('should toggle back', async () => {
      const res = await request
        .put('/api/v1/profile/donor-toggle')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// DONOR TESTS
// ─────────────────────────────────────────────────────────────────
describe('Donor API (/api/v1/donor)', () => {
  describe('PUT /availability', () => {
    it('should set availability to false', async () => {
      const res = await request
        .put('/api/v1/donor/availability')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isAvailable: false });
      expect(res.status).toBe(200);
      expect(res.body.isAvailable).toBe(false);
    });

    it('should set availability to true', async () => {
      const res = await request
        .put('/api/v1/donor/availability')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isAvailable: true });
      expect(res.status).toBe(200);
      expect(res.body.isAvailable).toBe(true);
    });

    it('should reject non-boolean value', async () => {
      const res = await request
        .put('/api/v1/donor/availability')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isAvailable: 'yes' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /eligibility', () => {
    it('should return eligibility check results', async () => {
      const res = await request
        .get('/api/v1/donor/eligibility')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.isEligible).toBe('boolean');
      expect(res.body.nextEligibleDate).toBeDefined();
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.age).toBeDefined();
      expect(res.body.checks.gap).toBeDefined();
      expect(res.body.checks.weight).toBeDefined();
    });

    it('should show eligible for first-time donor', async () => {
      const res = await request
        .get('/api/v1/donor/eligibility')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      // First-time donor with valid age and weight should be eligible
      expect(res.body.isEligible).toBe(true);
      expect(res.body.checks.gap.eligible).toBe(true);
    });

    it('should show ineligible after recent donation', async () => {
      await Donation.create({
        donor: testUser._id,
        bloodGroup: 'O+',
        units: 1,
        donatedAt: new Date(),
        verificationStatus: 'VERIFIED',
        certificateId: `CERT-${Date.now()}`,
      });

      const res = await request
        .get('/api/v1/donor/eligibility')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.isEligible).toBe(false);
      expect(res.body.checks.gap.eligible).toBe(false);
      expect(res.body.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('GET /history', () => {
    it('should return paginated donation history', async () => {
      const res = await request
        .get('/api/v1/donor/history')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.donations)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it('should respect page and limit params', async () => {
      const res = await request
        .get('/api/v1/donor/history?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should reject invalid page param', async () => {
      const res = await request
        .get('/api/v1/donor/history?page=-1')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /dashboard-stats', () => {
    it('should return donor dashboard statistics', async () => {
      const res = await request
        .get('/api/v1/donor/dashboard-stats')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.totalDonations).toBe('number');
      expect(typeof res.body.totalUnitsDonated).toBe('number');
      expect(typeof res.body.livesSaved).toBe('number');
      expect(typeof res.body.isEligible).toBe('boolean');
      expect(res.body.nextEligibleDate).toBeDefined();
      expect(Array.isArray(res.body.monthlyTrend)).toBe(true);
    });

    it('should show correct stats with donations', async () => {
      const res = await request
        .get('/api/v1/donor/dashboard-stats')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalDonations).toBeGreaterThanOrEqual(1);
      expect(res.body.livesSaved).toBeGreaterThanOrEqual(3);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// SERVICE UNIT TESTS – Eligibility Rules
// ─────────────────────────────────────────────────────────────────
describe('Donor Service – Eligibility Rules', () => {
  it('should enforce 90-day gap for males', async () => {
    const result = await checkDonorEligibility(testUser._id);
    expect(result.checks.gap.gapDaysRequired).toBe(90);
    expect(result.checks.gap.genderRuleApplied).toContain('Male');
  });

  it('should enforce 120-day gap for females', async () => {
    const femaleUser = await User.create({
      name: 'Female Donor',
      email: 'female@test.com',
      phone: '9876543222',
      mobile: '9876543222',
      password: 'TestPass@123',
      passwordHash: 'TestPass@123',
      role: 'DONOR',
      status: 'ACTIVE',
      isEmailVerified: true,
      isVerified: true,
      emailVerified: true,
      gender: 'FEMALE',
      dob: new Date('1990-01-01'),
      bloodGroup: 'A+',
    });

    await DonorProfile.create({
      user: femaleUser._id,
      bloodGroup: 'A+',
      isAvailable: true,
      status: 'ACTIVE',
      weight: 55,
    });

    const result = await checkDonorEligibility(femaleUser._id);
    expect(result.checks.gap.gapDaysRequired).toBe(120);
    expect(result.checks.gap.genderRuleApplied).toContain('Female');
  });

  it('should reject underage donors', async () => {
    const youngUser = await User.create({
      name: 'Young User',
      email: 'young@test.com',
      phone: '9876543333',
      mobile: '9876543333',
      password: 'TestPass@123',
      passwordHash: 'TestPass@123',
      role: 'USER',
      status: 'ACTIVE',
      isEmailVerified: true,
      isVerified: true,
      emailVerified: true,
      gender: 'MALE',
      dob: new Date(Date.now() - 16 * 365.25 * 86400000), // 16 years old
      bloodGroup: 'B+',
    });

    const result = await checkDonorEligibility(youngUser._id);
    expect(result.checks.age.eligible).toBe(false);
    expect(result.isEligible).toBe(false);
  });

  it('should reject underweight donors', async () => {
    const lightUser = await User.create({
      name: 'Light User',
      email: 'light@test.com',
      phone: '9876543444',
      mobile: '9876543444',
      password: 'TestPass@123',
      passwordHash: 'TestPass@123',
      role: 'DONOR',
      status: 'ACTIVE',
      isEmailVerified: true,
      isVerified: true,
      emailVerified: true,
      gender: 'MALE',
      dob: new Date('1995-01-01'),
      bloodGroup: 'AB+',
    });

    await DonorProfile.create({
      user: lightUser._id,
      bloodGroup: 'AB+',
      isAvailable: true,
      status: 'ACTIVE',
      weight: 42, // Below 50kg minimum
    });

    const result = await checkDonorEligibility(lightUser._id);
    expect(result.checks.weight.eligible).toBe(false);
    expect(result.isEligible).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// CRON JOB TESTS
// ─────────────────────────────────────────────────────────────────
describe('Donor Cron – Eligibility Reset', () => {
  it('should reset availability for eligible donors and create notifications', async () => {
    const cronUser = await User.create({
      name: 'Cron Test User',
      email: 'crontest@test.com',
      phone: '9876543555',
      mobile: '9876543555',
      password: 'TestPass@123',
      passwordHash: 'TestPass@123',
      role: 'DONOR',
      status: 'ACTIVE',
      isEmailVerified: true,
      isVerified: true,
      emailVerified: true,
      gender: 'MALE',
      dob: new Date('1990-01-01'),
      bloodGroup: 'O-',
    });

    await DonorProfile.create({
      user: cronUser._id,
      bloodGroup: 'O-',
      isAvailable: false, // Currently unavailable
      status: 'ACTIVE',
      weight: 70,
      nextEligibleDate: new Date(Date.now() - 86400000), // Yesterday
    });

    const result = await resetEligibleDonorAvailability();
    expect(result.resetCount).toBeGreaterThanOrEqual(1);
    expect(result.notifiedIds).toContain(cronUser._id.toString());

    // Verify notification was created
    const notification = await Notification.findOne({
      user: cronUser._id,
      type: 'DONOR_ELIGIBLE',
    });
    expect(notification).not.toBeNull();
    expect(notification.title).toContain('Eligible');

    // Verify donor profile was updated
    const updatedProfile = await DonorProfile.findOne({ user: cronUser._id });
    expect(updatedProfile.isAvailable).toBe(true);
  });

  it('should NOT reset donors still in cooldown', async () => {
    const cooldownUser = await User.create({
      name: 'Cooldown User',
      email: 'cooldown@test.com',
      phone: '9876543666',
      mobile: '9876543666',
      password: 'TestPass@123',
      passwordHash: 'TestPass@123',
      role: 'DONOR',
      status: 'ACTIVE',
      isEmailVerified: true,
      isVerified: true,
      emailVerified: true,
      gender: 'MALE',
      dob: new Date('1992-01-01'),
      bloodGroup: 'B-',
    });

    await DonorProfile.create({
      user: cooldownUser._id,
      bloodGroup: 'B-',
      isAvailable: false,
      status: 'ACTIVE',
      weight: 65,
      nextEligibleDate: new Date(Date.now() + 30 * 86400000), // 30 days in the future
    });

    const result = await resetEligibleDonorAvailability();
    expect(result.notifiedIds).not.toContain(cooldownUser._id.toString());

    const profile = await DonorProfile.findOne({ user: cooldownUser._id });
    expect(profile.isAvailable).toBe(false);
  });
});
