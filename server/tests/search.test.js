/**
 * Search API Integration Tests (/api/v1/search)
 *
 * Tests:
 * - GET /api/v1/search/donors (verified, available, eligible, masking phone, unmasking on accepted request, geoNear)
 * - GET /api/v1/search/blood-banks (verified banks, stock breakdown, geoNear distance sorting)
 * - GET /api/v1/search/availability (aggregate total units across banks, city filter, bloodGroup filter)
 */
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  User,
  DonorProfile,
  BloodBank,
  BloodInventory,
  BloodRequest,
} from '../src/models/index.js';
import searchRoutes from '../src/routes/search.routes.js';
import { generateTokens } from '../src/controllers/auth.controller.js';

// Setup test Express app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/search', searchRoutes);
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message });
});

let mongoServer;
let request;
let requesterUser;
let requesterToken;
let donorUser1;
let donorUser2;
let donorProfile1;
let donorProfile2;
let bank1;
let bank2;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // Ensure 2dsphere indexes are created
  await DonorProfile.init();
  await BloodBank.init();
  await BloodInventory.init();

  // ── Seed Requester User ──
  requesterUser = await User.create({
    name: 'Requester Person',
    email: 'requester@test.com',
    phone: '9876543200',
    mobile: '9876543200',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.8777, 19.076] }, // Mumbai [lng, lat]
  });
  requesterToken = generateTokens(requesterUser).accessToken;

  // ── Seed Eligible & Verified Donor 1 (Mumbai) ──
  donorUser1 = await User.create({
    name: 'Eligible Donor One',
    email: 'donor1@test.com',
    phone: '9876543211',
    mobile: '9876543211',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Mumbai',
    dob: new Date('1995-05-10'),
    bloodGroup: 'O+',
    location: { type: 'Point', coordinates: [72.878, 19.077] }, // ~150 meters from requester
  });

  donorProfile1 = await DonorProfile.create({
    user: donorUser1._id,
    bloodGroup: 'O+',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    weight: 68,
    dob: new Date('1995-05-10'),
    nextEligibleDate: new Date(Date.now() - 86400000), // Eligible (yesterday)
    totalDonations: 4,
    location: { type: 'Point', coordinates: [72.878, 19.077] },
  });

  // ── Seed Eligible & Verified Donor 2 (Pune, ~120km away) ──
  donorUser2 = await User.create({
    name: 'Eligible Donor Two',
    email: 'donor2@test.com',
    phone: '9876543222',
    mobile: '9876543222',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    isEmailVerified: true,
    isVerified: true,
    city: 'Pune',
    dob: new Date('1992-03-15'),
    bloodGroup: 'A+',
    location: { type: 'Point', coordinates: [73.8567, 18.5204] }, // Pune [lng, lat]
  });

  donorProfile2 = await DonorProfile.create({
    user: donorUser2._id,
    bloodGroup: 'A+',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    weight: 74,
    dob: new Date('1992-03-15'),
    nextEligibleDate: new Date(Date.now() - 86400000),
    totalDonations: 2,
    location: { type: 'Point', coordinates: [73.8567, 18.5204] },
  });

  // ── Seed Ineligible Donor (Cooldown active) ──
  const cooldownUser = await User.create({
    name: 'Cooldown Donor',
    email: 'cooldown@test.com',
    phone: '9876543233',
    role: 'DONOR',
    status: 'ACTIVE',
    city: 'Mumbai',
    dob: new Date('1990-01-01'),
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });
  await DonorProfile.create({
    user: cooldownUser._id,
    bloodGroup: 'O+',
    isAvailable: true,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    nextEligibleDate: new Date(Date.now() + 30 * 86400000), // 30 days in future
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });

  // ── Seed Unavailable Donor ──
  const unavailUser = await User.create({
    name: 'Unavailable Donor',
    email: 'unavail@test.com',
    phone: '9876543244',
    role: 'DONOR',
    status: 'ACTIVE',
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });
  await DonorProfile.create({
    user: unavailUser._id,
    bloodGroup: 'O+',
    isAvailable: false,
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    nextEligibleDate: new Date(Date.now() - 86400000),
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });

  // ── Seed Unverified Donor ──
  const unverifiedUser = await User.create({
    name: 'Unverified Donor',
    email: 'unverified@test.com',
    phone: '9876543255',
    role: 'DONOR',
    status: 'ACTIVE',
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });
  await DonorProfile.create({
    user: unverifiedUser._id,
    bloodGroup: 'O+',
    isAvailable: true,
    isVerified: false,
    verificationStatus: 'PENDING',
    status: 'ACTIVE',
    nextEligibleDate: new Date(Date.now() - 86400000),
    location: { type: 'Point', coordinates: [72.88, 19.08] },
  });

  // ── Seed Verified Blood Bank 1 (Mumbai) ──
  bank1 = await BloodBank.create({
    name: 'Central Mumbai Blood Bank',
    email: 'mumbai.bank@test.com',
    phone: '022-24110000',
    registrationNumber: 'BB-MUM-001',
    licenseNumber: 'BB-MUM-001',
    address: { line: '100 Dadar East', city: 'Mumbai', state: 'Maharashtra', pincode: '400014' },
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400014',
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'VERIFIED',
    location: { type: 'Point', coordinates: [72.843, 19.018] },
  });

  // Seed inventory for Bank 1
  await BloodInventory.create({
    bloodBank: bank1._id,
    bloodGroup: 'O+',
    unitsAvailable: 25,
    available: 25,
    unitsReserved: 5,
    reserved: 5,
  });
  await BloodInventory.create({
    bloodBank: bank1._id,
    bloodGroup: 'A+',
    unitsAvailable: 10,
    available: 10,
    unitsReserved: 2,
    reserved: 2,
  });
  await BloodInventory.create({
    bloodBank: bank1._id,
    bloodGroup: 'B+',
    unitsAvailable: 15,
    available: 15,
  });

  // ── Seed Verified Blood Bank 2 (Pune) ──
  bank2 = await BloodBank.create({
    name: 'Pune Apex Blood Bank',
    email: 'pune.bank@test.com',
    phone: '020-25670000',
    registrationNumber: 'BB-PUN-002',
    licenseNumber: 'BB-PUN-002',
    address: { line: '50 FC Road', city: 'Pune', state: 'Maharashtra', pincode: '411005' },
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411005',
    isVerified: true,
    verificationStatus: 'VERIFIED',
    status: 'VERIFIED',
    location: { type: 'Point', coordinates: [73.84, 18.53] },
  });

  // Seed inventory for Bank 2
  await BloodInventory.create({
    bloodBank: bank2._id,
    bloodGroup: 'O+',
    unitsAvailable: 40,
    available: 40,
    unitsReserved: 10,
    reserved: 10,
  });
  await BloodInventory.create({
    bloodBank: bank2._id,
    bloodGroup: 'AB+',
    unitsAvailable: 8,
    available: 8,
  });

  // ── Seed Unverified Blood Bank (should NOT appear) ──
  await BloodBank.create({
    name: 'Unverified Blood Bank',
    city: 'Mumbai',
    isVerified: false,
    verificationStatus: 'PENDING',
    status: 'PENDING',
    location: { type: 'Point', coordinates: [72.85, 19.02] },
  });
}, 180000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}, 15000);

// ─────────────────────────────────────────────────────────────────
// 1. DONOR SEARCH TESTS (/api/v1/search/donors)
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/search/donors', () => {
  it('should return 200 with list of verified, eligible, available donors', async () => {
    const res = await request.get('/api/v1/search/donors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.donors)).toBe(true);
    // Should include eligible verified donors (Donor 1 & 2) and exclude unverified, unavailable, or cooling-down
    expect(res.body.donors.length).toBe(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(2);
  });

  it('should filter donors by bloodGroup', async () => {
    const res = await request.get('/api/v1/search/donors?bloodGroup=O%2B');
    expect(res.status).toBe(200);
    expect(res.body.donors.length).toBe(1);
    expect(res.body.donors[0].bloodGroup).toBe('O+');
    expect(res.body.donors[0].user.name).toBe('Eligible Donor One');
  });

  it('should filter donors by city (case-insensitive)', async () => {
    const res = await request.get('/api/v1/search/donors?city=mumbai');
    expect(res.status).toBe(200);
    expect(res.body.donors.length).toBe(1);
    expect(res.body.donors[0].user.city).toBe('Mumbai');
  });

  it('should hide sensitive data and mask phone number by default', async () => {
    const res = await request.get('/api/v1/search/donors');
    expect(res.status).toBe(200);
    const donor = res.body.donors.find((d) => d.bloodGroup === 'O+');
    expect(donor).toBeDefined();

    // Check sensitive data hidden
    expect(donor.user.password).toBeUndefined();
    expect(donor.user.passwordHash).toBeUndefined();
    expect(donor.medicalNotes).toBeUndefined();
    expect(donor.medicalConditions).toBeUndefined();

    // Check phone is masked
    expect(donor.user.phoneMasked).toBe(true);
    expect(donor.user.phone).toContain('**');
    expect(donor.user.phone).not.toBe('9876543211');
  });

  it('should UNMASK phone number when requester has an ACCEPTED blood request with donor', async () => {
    // Create an ACCEPTED request between requesterUser and donorUser1
    await BloodRequest.create({
      requester: requesterUser._id,
      patientName: 'Patient In Need',
      bloodGroup: 'O+',
      units: 1,
      city: 'Mumbai',
      status: 'DONOR_FOUND',
      assignedDonors: [
        {
          donor: donorUser1._id,
          status: 'ACCEPTED',
          assignedAt: new Date(),
        },
      ],
    });

    // Query donors authenticated as requesterUser
    const res = await request
      .get('/api/v1/search/donors?bloodGroup=O%2B')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.donors.length).toBe(1);
    const donor = res.body.donors[0];

    // Phone should now be unmasked for donorUser1
    expect(donor.user.phoneMasked).toBe(false);
    expect(donor.user.phone).toBe('9876543211');
  });

  it('should support geospatial proximity search with lat, lng, and radiusKm', async () => {
    // Search near Mumbai: lat=19.076, lng=72.8777, radius=10km
    const res = await request.get(
      '/api/v1/search/donors?lat=19.076&lng=72.8777&radiusKm=10'
    );
    expect(res.status).toBe(200);
    // Only Mumbai donor should be in 10km radius (Pune is ~120km away)
    expect(res.body.donors.length).toBe(1);
    expect(res.body.donors[0].user.name).toBe('Eligible Donor One');
    expect(typeof res.body.donors[0].distanceKm).toBe('number');
    expect(res.body.donors[0].distanceKm).toBeLessThan(10);
  });

  it('should sort by distance when lat & lng are provided', async () => {
    // Search near Mumbai with larger radius (200km) to include both Mumbai & Pune
    const res = await request.get(
      '/api/v1/search/donors?lat=19.076&lng=72.8777&radiusKm=200'
    );
    expect(res.status).toBe(200);
    expect(res.body.donors.length).toBe(2);
    // Nearest donor (Mumbai, ~0.1km) must come before Pune donor (~120km)
    expect(res.body.donors[0].distanceKm).toBeLessThan(res.body.donors[1].distanceKm);
    expect(res.body.donors[0].user.city).toBe('Mumbai');
    expect(res.body.donors[1].user.city).toBe('Pune');
  });

  it('should support pagination (page & limit)', async () => {
    const res = await request.get('/api/v1/search/donors?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.donors.length).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.hasNextPage).toBe(true);
  });

  it('should reject invalid bloodGroup with 400', async () => {
    const res = await request.get('/api/v1/search/donors?bloodGroup=INVALID');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid lat/lng coordinates with 400', async () => {
    const res = await request.get('/api/v1/search/donors?lat=100&lng=72.8');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. BLOOD BANK SEARCH TESTS (/api/v1/search/blood-banks)
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/search/blood-banks', () => {
  it('should return 200 with verified blood banks and stock breakdown per group', async () => {
    const res = await request.get('/api/v1/search/blood-banks');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bloodBanks)).toBe(true);
    // Verified Bank 1 & Bank 2 only (unverified bank excluded)
    expect(res.body.bloodBanks.length).toBe(2);

    const mumbank = res.body.bloodBanks.find((b) => b.name === 'Central Mumbai Blood Bank');
    expect(mumbank).toBeDefined();
    expect(mumbank.stock).toBeDefined();
    expect(mumbank.stock['O+']).toBe(25);
    expect(mumbank.stock['A+']).toBe(10);
    expect(mumbank.stock['B+']).toBe(15);
    expect(mumbank.stock['AB+']).toBe(0);
    expect(mumbank.totalUnitsAvailable).toBe(50);
  });

  it('should filter blood banks by city', async () => {
    const res = await request.get('/api/v1/search/blood-banks?city=mumbai');
    expect(res.status).toBe(200);
    expect(res.body.bloodBanks.length).toBe(1);
    expect(res.body.bloodBanks[0].name).toBe('Central Mumbai Blood Bank');
  });

  it('should highlight requestedGroupAvailability when bloodGroup param provided', async () => {
    const res = await request.get('/api/v1/search/blood-banks?bloodGroup=O%2B');
    expect(res.status).toBe(200);
    const bank = res.body.bloodBanks[0];
    expect(bank.requestedGroupAvailability).toBeDefined();
    expect(bank.requestedGroupAvailability.bloodGroup).toBe('O+');
    expect(bank.requestedGroupAvailability.availableUnits).toBeGreaterThan(0);
    expect(bank.requestedGroupAvailability.hasStock).toBe(true);
  });

  it('should calculate distanceKm and sort by proximity when lat & lng provided', async () => {
    // Near Dadar Mumbai: lat=19.018, lng=72.843
    const res = await request.get(
      '/api/v1/search/blood-banks?lat=19.018&lng=72.843&radiusKm=200'
    );
    expect(res.status).toBe(200);
    expect(res.body.bloodBanks.length).toBe(2);
    // Mumbai bank is at distance ~0km, Pune is ~120km
    expect(res.body.bloodBanks[0].name).toBe('Central Mumbai Blood Bank');
    expect(res.body.bloodBanks[0].distanceKm).toBeLessThan(5);
    expect(res.body.bloodBanks[1].name).toBe('Pune Apex Blood Bank');
    expect(res.body.bloodBanks[0].distanceKm).toBeLessThan(res.body.bloodBanks[1].distanceKm);
  });

  it('should filter banks within radiusKm', async () => {
    const res = await request.get(
      '/api/v1/search/blood-banks?lat=19.018&lng=72.843&radiusKm=20'
    );
    expect(res.status).toBe(200);
    // Only Mumbai bank in 20km radius
    expect(res.body.bloodBanks.length).toBe(1);
    expect(res.body.bloodBanks[0].name).toBe('Central Mumbai Blood Bank');
  });

  it('should support pagination (page & limit)', async () => {
    const res = await request.get('/api/v1/search/blood-banks?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.bloodBanks.length).toBe(1);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. AGGREGATE AVAILABILITY TESTS (/api/v1/search/availability)
// ─────────────────────────────────────────────────────────────────
describe('GET /api/v1/search/availability', () => {
  it('should aggregate total blood units across all verified banks', async () => {
    const res = await request.get('/api/v1/search/availability');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verifiedBanksCount).toBe(2);

    // O+ total: Bank 1 (25) + Bank 2 (40) = 65
    expect(res.body.breakdown['O+'].totalAvailable).toBe(65);
    expect(res.body.breakdown['O+'].banksWithStockCount).toBe(2);

    // A+ total: Bank 1 (10) + Bank 2 (0) = 10
    expect(res.body.breakdown['A+'].totalAvailable).toBe(10);
    expect(res.body.breakdown['A+'].banksWithStockCount).toBe(1);

    // AB+ total: Bank 1 (0) + Bank 2 (8) = 8
    expect(res.body.breakdown['AB+'].totalAvailable).toBe(8);

    // Overall total: 25 + 10 + 15 + 40 + 8 = 98
    expect(res.body.totalUnitsAvailable).toBe(98);
  });

  it('should aggregate total units for a specific bloodGroup', async () => {
    const res = await request.get('/api/v1/search/availability?bloodGroup=O%2B');
    expect(res.status).toBe(200);
    expect(res.body.bloodGroup).toBe('O+');
    expect(res.body.totalUnitsAvailable).toBe(65);
    expect(res.body.groups.length).toBe(1);
    expect(res.body.groups[0].bloodGroup).toBe('O+');
    expect(res.body.groups[0].totalAvailable).toBe(65);
  });

  it('should aggregate total units filtered by city', async () => {
    const res = await request.get('/api/v1/search/availability?city=pune');
    expect(res.status).toBe(200);
    expect(res.body.city).toBe('pune');
    expect(res.body.verifiedBanksCount).toBe(1);

    // Pune only has Bank 2: O+ (40), AB+ (8) => Total 48
    expect(res.body.totalUnitsAvailable).toBe(48);
    expect(res.body.breakdown['O+'].totalAvailable).toBe(40);
    expect(res.body.breakdown['AB+'].totalAvailable).toBe(8);
    expect(res.body.breakdown['A+'].totalAvailable).toBe(0);
  });

  it('should return 0 units for a city with no verified banks', async () => {
    const res = await request.get('/api/v1/search/availability?city=NonExistentCity');
    expect(res.status).toBe(200);
    expect(res.body.totalUnitsAvailable).toBe(0);
    expect(res.body.verifiedBanksCount).toBe(0);
  });

  it('should reject invalid bloodGroup with 400', async () => {
    const res = await request.get('/api/v1/search/availability?bloodGroup=XYZ');
    expect(res.status).toBe(400);
  });
});
