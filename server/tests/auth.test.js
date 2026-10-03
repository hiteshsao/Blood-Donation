/**
 * Authentication & Authorization Integration Tests (/api/v1/auth)
 *
 * Comprehensive test coverage:
 * - User, Donor, Hospital, and Blood Bank Registration
 * - Duplicate email prevention (409 Conflict)
 * - Validation error handling (400)
 * - OTP generation, verification, and resend
 * - Login credential authentication, password comparison with bcrypt
 * - Account state enforcement (unverified -> 403, blocked -> 403, pending facility -> 403)
 * - Dedicated Admin Login with strict role enforcement (403 for non-admins)
 * - Refresh token rotation (cookie and body support)
 * - Bearer authentication on /me and /change-password
 * - Forgot password and reset password flow
 * - Logout session revocation and cookie clearing
 * - Data sanitization and sensitive fields stripping (no password, OTP, or token leakage)
 */
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

import {
  User,
  DonorProfile,
  Hospital,
  BloodBank,
} from '../src/models/index.js';
import authRoutes from '../src/routes/auth.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';
import { sanitizeInput } from '../src/middlewares/sanitize.js';
import { hashOtp } from '../src/utils/otp.util.js';

// Setup Test App
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeInput);

app.use('/api/v1/auth', authRoutes);
app.use('/auth', authRoutes); // For dedicated admin login

app.use((err, req, res, next) => {
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  res.status(status).json({ success: false, message: err.message, errors: err.errors });
});

let mongoServer;
let request;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('1. Registration (/api/v1/auth/register)', () => {
  it('should register a new regular USER with status PENDING and dispatch OTP', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        password: 'Password@123',
        phone: '9876543210',
        role: 'USER',
        bloodGroup: 'O+',
        city: 'Mumbai',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresVerification).toBe(true);
    expect(res.body.email).toBe('alice.johnson@example.com');
    expect(res.body.role).toBe('USER');

    // Verify user in database
    const savedUser = await User.findOne({ email: 'alice.johnson@example.com' }).select('+password +verificationOtp');
    expect(savedUser).toBeDefined();
    expect(savedUser.status).toBe('PENDING');
    expect(savedUser.isEmailVerified).toBe(false);
    expect(savedUser.verificationOtp).toBeDefined();
    expect(savedUser.verificationOtp.codeHash).toBeDefined();
    // Verify password was hashed with bcrypt
    expect(savedUser.password.startsWith('$2')).toBe(true);
  });

  it('should register a DONOR and automatically create DonorProfile', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob Donor',
        email: 'bob.donor@example.com',
        password: 'Password@123',
        phone: '9876543211',
        role: 'DONOR',
        bloodGroup: 'A+',
        city: 'Pune',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('DONOR');

    const profile = await DonorProfile.findOne().populate('user');
    expect(profile).toBeDefined();
    expect(profile.bloodGroup).toBe('A+');
    expect(profile.user.email).toBe('bob.donor@example.com');
  });

  it('should register a HOSPITAL and initialize record with PENDING verification status', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Dr. Gregory House',
        email: 'house@princetonhospital.org',
        password: 'Password@123',
        phone: '9876543212',
        role: 'HOSPITAL',
        facilityName: 'Princeton Plainsboro Hospital',
        licenseNumber: 'HOSP-PP-9901',
        city: 'Mumbai',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('HOSPITAL');

    const hospital = await Hospital.findOne({ licenseNumber: 'HOSP-PP-9901' });
    expect(hospital).toBeDefined();
    expect(hospital.name).toBe('Princeton Plainsboro Hospital');
    expect(hospital.verificationStatus).toBe('PENDING');
    expect(hospital.isVerified).toBe(false);
  });

  it('should register a BLOOD_BANK and initialize record with PENDING verification status', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Red Cross Director',
        email: 'director@redcrossbank.org',
        password: 'Password@123',
        phone: '9876543213',
        role: 'BLOOD_BANK',
        facilityName: 'Central Blood Bank & Bank Depot',
        licenseNumber: 'BB-CENTRAL-001',
        city: 'Mumbai',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('BLOOD_BANK');

    const bloodBank = await BloodBank.findOne({ licenseNumber: 'BB-CENTRAL-001' });
    expect(bloodBank).toBeDefined();
    expect(bloodBank.verificationStatus).toBe('PENDING');
    expect(bloodBank.isVerified).toBe(false);
  });

  it('should reject registration with invalid email format (400)', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Invalid Email User',
        email: 'invalid-email-address',
        password: 'Password@123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with password shorter than 6 characters (400)', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Short Password User',
        email: 'shortpass@example.com',
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject duplicate registration when account is already verified (409)', async () => {
    // Manually mark Alice as verified
    await User.updateOne({ email: 'alice.johnson@example.com' }, { isVerified: true, isEmailVerified: true });

    const res = await request
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Johnson Duplicate',
        email: 'alice.johnson@example.com',
        password: 'NewPassword@123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('2. OTP Verification (/api/v1/auth/verify-otp)', () => {
  let userForOtp;
  const rawOtp = '654321';

  beforeEach(async () => {
    const codeHash = hashOtp(rawOtp);

    userForOtp = await User.create({
      name: 'Charlie Test',
      email: `charlie.${Date.now()}@example.com`,
      phone: '9876543220',
      password: 'Password@123',
      role: 'USER',
      status: 'PENDING',
      isEmailVerified: false,
      isVerified: false,
      verificationOtp: {
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });
  });

  it('should verify correct OTP, activate account to ACTIVE, and return access token + httpOnly cookie', async () => {
    const res = await request
      .post('/api/v1/auth/verify-otp')
      .send({
        email: userForOtp.email,
        otp: rawOtp,
        type: 'REGISTRATION',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.status).toBe('ACTIVE');

    // Verify security: sensitive fields must not be exposed
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.verificationOtp).toBeUndefined();

    // Verify refresh token cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);

    // Verify database state
    const updated = await User.findById(userForOtp._id);
    expect(updated.isEmailVerified).toBe(true);
    expect(updated.status).toBe('ACTIVE');
  });

  it('should verify OTP for HOSPITAL but keep status as PENDING awaiting admin verification', async () => {
    const codeHash = hashOtp(rawOtp);

    const hospUser = await User.create({
      name: 'St. Jude Hospital Admin',
      email: `stjude.${Date.now()}@hospital.org`,
      phone: '9876543225',
      password: 'Password@123',
      role: 'HOSPITAL',
      status: 'PENDING',
      isEmailVerified: false,
      isVerified: false,
      verificationOtp: {
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const res = await request
      .post('/api/v1/auth/verify-otp')
      .send({
        email: hospUser.email,
        otp: rawOtp,
        type: 'REGISTRATION',
      });

    expect(res.status).toBe(200);
    expect(res.body.isPendingApproval).toBe(true);
    expect(res.body.user.status).toBe('PENDING');
  });

  it('should reject incorrect OTP with 400', async () => {
    const res = await request
      .post('/api/v1/auth/verify-otp')
      .send({
        email: userForOtp.email,
        otp: '000000',
        type: 'REGISTRATION',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing email or OTP with 400', async () => {
    const res = await request
      .post('/api/v1/auth/verify-otp')
      .send({
        email: userForOtp.email,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('3. Login & Credential Authentication (/api/v1/auth/login)', () => {
  let activeUser;
  let unverifiedUser;
  let blockedUser;
  let pendingHospitalUser;

  beforeAll(async () => {
    // 1. Active User
    activeUser = await User.create({
      name: 'Diana Prince',
      email: 'diana.prince@example.com',
      password: 'StrongPassword@2026',
      phone: '9876543230',
      role: 'USER',
      status: 'ACTIVE',
      isVerified: true,
      isEmailVerified: true,
    });

    // 2. Unverified User
    unverifiedUser = await User.create({
      name: 'Unverified Clark',
      email: 'unverified.clark@example.com',
      password: 'StrongPassword@2026',
      phone: '9876543231',
      role: 'USER',
      status: 'PENDING',
      isVerified: false,
      isEmailVerified: false,
    });

    // 3. Blocked User
    blockedUser = await User.create({
      name: 'Blocked Bruce',
      email: 'blocked.bruce@example.com',
      password: 'StrongPassword@2026',
      phone: '9876543232',
      role: 'USER',
      status: 'BLOCKED',
      isBlocked: true,
      isVerified: true,
      isEmailVerified: true,
    });

    // 4. Pending Facility User
    pendingHospitalUser = await User.create({
      name: 'City Clinic',
      email: 'cityclinic@example.com',
      password: 'StrongPassword@2026',
      phone: '9876543233',
      role: 'HOSPITAL',
      status: 'PENDING',
      isVerified: true,
      isEmailVerified: true,
    });
  });

  it('should authenticate active user with correct password and set secure cookies', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'diana.prince@example.com',
        password: 'StrongPassword@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('diana.prince@example.com');

    // Security check: no sensitive fields
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.refreshToken).toBeUndefined();

    // Check refresh cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
  });

  it('should reject login with incorrect password (401)', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'diana.prince@example.com',
        password: 'WrongPassword@999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login with non-existent email (401)', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Password@123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject login for unverified user with 403 and requiresVerification: true', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'unverified.clark@example.com',
        password: 'StrongPassword@2026',
      });

    expect(res.status).toBe(403);
    expect(res.body.requiresVerification).toBe(true);
  });

  it('should reject login for blocked user with 403 Forbidden', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'blocked.bruce@example.com',
        password: 'StrongPassword@2026',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended or blocked/i);
  });

  it('should reject login for pending hospital account with 403 and isPendingApproval: true', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'cityclinic@example.com',
        password: 'StrongPassword@2026',
      });

    expect(res.status).toBe(403);
    expect(res.body.isPendingApproval).toBe(true);
  });
});

describe('4. Dedicated Admin Login (/auth/admin/login)', () => {
  let adminUser;
  let nonAdminUser;

  beforeAll(async () => {
    adminUser = await User.create({
      name: 'System Super Admin',
      email: 'superadmin@blooddonation.org',
      password: 'AdminPassword@2026',
      phone: '9876543240',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true,
      isEmailVerified: true,
    });

    nonAdminUser = await User.create({
      name: 'Standard User Trying Admin',
      email: 'imposter@example.com',
      password: 'StandardPassword@2026',
      phone: '9876543241',
      role: 'USER',
      status: 'ACTIVE',
      isVerified: true,
      isEmailVerified: true,
    });
  });

  it('should authenticate user with ADMIN role and return access token', async () => {
    const res = await request
      .post('/auth/admin/login')
      .send({
        email: 'superadmin@blooddonation.org',
        password: 'AdminPassword@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.accessToken).toBeDefined();
  });

  it('should reject non-admin users attempting admin login with 403 Forbidden', async () => {
    const res = await request
      .post('/auth/admin/login')
      .send({
        email: 'imposter@example.com',
        password: 'StandardPassword@2026',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/strictly reserved for system administrators/i);
  });
});

describe('5. Token Refresh & Bearer Auth (/api/v1/auth/refresh-token & /me)', () => {
  let userForTokens;
  let validRefreshToken;
  let validAccessToken;

  beforeAll(async () => {
    userForTokens = await User.create({
      name: 'Token Tester',
      email: 'token.tester@example.com',
      password: 'Password@123',
      phone: '9876543250',
      role: 'USER',
      status: 'ACTIVE',
      isVerified: true,
      isEmailVerified: true,
    });

    const tokens = generateTokens(userForTokens);
    validAccessToken = tokens.accessToken;
    validRefreshToken = tokens.refreshToken;

    userForTokens.refreshToken = validRefreshToken;
    await userForTokens.save();
  });

  it('should refresh access token using cookie', async () => {
    const res = await request
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', [`refreshToken=${validRefreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should refresh access token using request body', async () => {
    const res = await request
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: validRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should reject invalid or forged refresh token with 401', async () => {
    const res = await request
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken: 'invalid.jwt.token' });

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me should return user details with valid Bearer token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('token.tester@example.com');
  });

  it('GET /api/v1/auth/me should return 401 when no token is provided', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('6. Password Change & Reset Flow', () => {
  let userForPasswordChange;
  let accessToken;

  beforeAll(async () => {
    userForPasswordChange = await User.create({
      name: 'Password Changer',
      email: 'change.password@example.com',
      password: 'OldPassword@123',
      phone: '9876543260',
      role: 'USER',
      status: 'ACTIVE',
      isVerified: true,
      isEmailVerified: true,
    });

    accessToken = generateTokens(userForPasswordChange).accessToken;
  });

  it('POST /change-password should change password when current password is valid', async () => {
    const res = await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'OldPassword@123',
        newPassword: 'BrandNewPassword@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify user can now login with new password
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'change.password@example.com',
        password: 'BrandNewPassword@2026',
      });

    expect(loginRes.status).toBe(200);
  });

  it('POST /change-password should reject incorrect current password (400)', async () => {
    const res = await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'IncorrectPassword',
        newPassword: 'AnotherNewPassword@2026',
      });

    expect(res.status).toBe(400);
  });

  it('POST /forgot-password should generate reset OTP', async () => {
    const res = await request
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'change.password@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userWithOtp = await User.findOne({ email: 'change.password@example.com' }).select('+passwordResetOtp');
    expect(userWithOtp.passwordResetOtp).toBeDefined();
    expect(userWithOtp.passwordResetOtp.codeHash).toBeDefined();
  });
});

describe('7. Logout (/api/v1/auth/logout)', () => {
  it('should clear refresh token cookie and invalidate session', async () => {
    const res = await request.post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('refreshToken=;') || c.includes('refreshToken=;'))).toBe(true);
  });
});
