/**
 * Comprehensive Integration Tests for Reports & Clinical Analytics (/api/v1/admin/reports & export)
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
} from '../src/models/index.js';
import adminRoutes from '../src/routes/admin.routes.js';
import { authenticate, isAdmin } from '../src/middlewares/auth.js';
import * as adminController from '../src/controllers/admin.controller.js';
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

let donorUser1;
let donorUser2;
let hospitalDoc;
let bankDoc;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount admin routes
  app.use('/api/v1/admin', adminRoutes);

  // Mount direct export route alias
  app.get('/reports/:type/export', authenticate, isAdmin, adminController.exportReport);
  app.get('/reports/export', authenticate, isAdmin, adminController.exportReport);
  app.get('/reports', authenticate, isAdmin, adminController.getReports);

  // Global error handler
  app.use((err, req, res, next) => {
    const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    res.status(status).json({ success: false, message: err.message });
  });

  server = http.createServer(app);
  initSocket(server);
  request = supertest(app);

  // 1. Seed Admin
  adminUser = await User.create({
    name: 'Clinical Admin',
    email: 'reports.admin@lifedrop.org',
    phone: '9811112233',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'ADMIN',
    status: 'ACTIVE',
    isEmailVerified: true,
  });
  adminToken = generateTokens(adminUser).accessToken;

  // 2. Seed Regular User
  regularUser = await User.create({
    name: 'Vikram Joshi',
    email: 'vikram.joshi@example.com',
    phone: '9822223344',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'USER',
    status: 'ACTIVE',
    city: 'Mumbai',
    bloodGroup: 'B+',
    isEmailVerified: true,
  });
  regularToken = generateTokens(regularUser).accessToken;

  // 3. Seed Donors
  donorUser1 = await User.create({
    name: 'Pooja Verma',
    email: 'pooja.verma@example.com',
    phone: '9833334455',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    city: 'Mumbai',
    bloodGroup: 'O+',
    isVerified: true,
    isEmailVerified: true,
  });

  await DonorProfile.create({
    user: donorUser1._id,
    bloodGroup: 'O+',
    verificationStatus: 'VERIFIED',
    isVerified: true,
    isAvailable: true,
    totalDonations: 3,
  });

  donorUser2 = await User.create({
    name: 'Aman Khan',
    email: 'aman.khan@example.com',
    phone: '9844445566',
    password: 'Password@123',
    passwordHash: 'Password@123',
    role: 'DONOR',
    status: 'ACTIVE',
    city: 'Pune',
    bloodGroup: 'A+',
    isVerified: true,
    isEmailVerified: true,
  });

  await DonorProfile.create({
    user: donorUser2._id,
    bloodGroup: 'A+',
    verificationStatus: 'VERIFIED',
    isVerified: true,
    isAvailable: true,
    totalDonations: 5,
  });

  // 4. Seed Hospital & Blood Bank
  hospitalDoc = await Hospital.create({
    user: adminUser._id,
    name: 'Metro General Hospital',
    email: 'info@metrohospital.org',
    phone: '9855556677',
    licenseNumber: 'LIC-METRO-101',
    address: '12 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    verificationStatus: 'VERIFIED',
  });

  bankDoc = await BloodBank.create({
    user: adminUser._id,
    name: 'Central Blood Bank',
    email: 'contact@centralbank.org',
    phone: '9866667788',
    licenseNumber: 'LIC-BB-202',
    address: '45 Camp Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    verificationStatus: 'VERIFIED',
  });

  // 5. Seed Inventory
  await BloodInventory.create([
    {
      bloodBank: bankDoc._id,
      bloodGroup: 'O+',
      available: 25,
      reserved: 2,
      expired: 0,
      lowStockThreshold: 5,
    },
    {
      bloodBank: bankDoc._id,
      bloodGroup: 'A+',
      available: 15,
      reserved: 0,
      expired: 1,
      lowStockThreshold: 5,
    },
    {
      bloodBank: bankDoc._id,
      bloodGroup: 'B+',
      available: 8,
      reserved: 1,
      expired: 0,
      lowStockThreshold: 5,
    },
  ]);

  // 6. Seed Donations
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10);

  await Donation.create([
    {
      donor: donorUser1._id,
      bloodBank: bankDoc._id,
      hospital: hospitalDoc._id,
      bloodGroup: 'O+',
      units: 2,
      donatedAt: now,
      verificationStatus: 'VERIFIED',
      certificateId: 'CERT-TEST-001',
    },
    {
      donor: donorUser1._id,
      bloodBank: bankDoc._id,
      hospital: hospitalDoc._id,
      bloodGroup: 'O+',
      units: 1,
      donatedAt: lastMonth,
      verificationStatus: 'VERIFIED',
      certificateId: 'CERT-TEST-002',
    },
    {
      donor: donorUser2._id,
      bloodBank: bankDoc._id,
      hospital: hospitalDoc._id,
      bloodGroup: 'A+',
      units: 3,
      donatedAt: twoMonthsAgo,
      verificationStatus: 'VERIFIED',
      certificateId: 'CERT-TEST-003',
    },
  ]);

  // 7. Seed Blood Requests
  await BloodRequest.create([
    {
      requester: regularUser._id,
      hospital: hospitalDoc._id,
      hospitalName: hospitalDoc.name,
      patientName: 'Kavita Patel',
      bloodGroup: 'O+',
      units: 2,
      city: 'Mumbai',
      urgency: 'URGENT',
      status: 'FULFILLED',
      createdAt: now,
    },
    {
      requester: regularUser._id,
      hospital: hospitalDoc._id,
      hospitalName: hospitalDoc.name,
      patientName: 'Ramesh Sen',
      bloodGroup: 'B+',
      units: 3,
      city: 'Pune',
      urgency: 'ROUTINE',
      status: 'PENDING',
      createdAt: lastMonth,
    },
    {
      requester: regularUser._id,
      hospital: hospitalDoc._id,
      hospitalName: hospitalDoc.name,
      patientName: 'Deepak Roy',
      bloodGroup: 'A+',
      units: 1,
      city: 'Mumbai',
      urgency: 'NORMAL',
      status: 'IN_PROGRESS',
      createdAt: twoMonthsAgo,
    },
  ]);

  // 8. Seed Emergency Requests with donor responses to test response time
  const emergencyCreatedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
  const notifiedTime = new Date(emergencyCreatedAt.getTime() + 1 * 60 * 1000); // 1 min after creation
  const respondedTime = new Date(notifiedTime.getTime() + 4 * 60 * 1000); // 4 mins later (240s)

  const emDoc = await EmergencyRequest.create({
    requester: regularUser._id,
    hospital: hospitalDoc._id,
    patientName: 'ICU Critical Patient',
    bloodGroup: 'O+',
    units: 2,
    city: 'Mumbai',
    urgency: 'CRITICAL',
    status: 'FULFILLED',
    notifiedDonors: [
      {
        donor: donorUser1._id,
        response: 'ACCEPTED',
        status: 'ACCEPTED',
        distanceKm: 5,
        notifiedAt: notifiedTime,
        respondedAt: respondedTime,
      },
    ],
  });

  // Force createdAt and updatedAt using direct MongoDB update (Mongoose timestamps override manual values during create)
  const resolvedAt = new Date(respondedTime.getTime() + 10 * 60 * 1000);
  await EmergencyRequest.collection.updateOne(
    { _id: emDoc._id },
    { $set: { createdAt: emergencyCreatedAt, updatedAt: resolvedAt } }
  );
}, 60000);

afterAll(async () => {
  if (server) server.close();
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('1. Security & Role Authorization on Reports', () => {
  it('should return 401 when no token is provided to /api/v1/admin/reports', async () => {
    const res = await request.get('/api/v1/admin/reports');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 when a non-admin user requests /api/v1/admin/reports', async () => {
    const res = await request
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 200 when authenticated as ADMIN', async () => {
    const res = await request
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

describe('2. MongoDB Aggregation Pipelines (/api/v1/admin/reports)', () => {
  let reportData;

  beforeAll(async () => {
    const res = await request
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    reportData = res.body.data;
  });

  it('should calculate donations per month', () => {
    const { donationsPerMonth } = reportData;
    expect(Array.isArray(donationsPerMonth)).toBe(true);
    expect(donationsPerMonth.length).toBeGreaterThanOrEqual(1);

    const first = donationsPerMonth[0];
    expect(first).toHaveProperty('year');
    expect(first).toHaveProperty('month');
    expect(first).toHaveProperty('monthLabel');
    expect(first).toHaveProperty('donationsCount');
    expect(first).toHaveProperty('unitsDonated');
    expect(first.unitsDonated).toBeGreaterThanOrEqual(1);
  });

  it('should calculate requests by status', () => {
    const { requestsByStatus } = reportData;
    expect(Array.isArray(requestsByStatus)).toBe(true);
    expect(requestsByStatus.length).toBeGreaterThanOrEqual(1);

    const statuses = requestsByStatus.map((r) => r.status);
    expect(statuses).toEqual(expect.arrayContaining(['FULFILLED', 'PENDING', 'IN_PROGRESS']));

    const fulfilled = requestsByStatus.find((r) => r.status === 'FULFILLED');
    expect(fulfilled).toBeDefined();
    expect(fulfilled.count).toBe(1);
    expect(fulfilled.totalUnits).toBe(2);
  });

  it('should calculate blood group demand vs supply for all 8 standard blood groups', () => {
    const { bloodGroupDemandVsSupply } = reportData;
    expect(Array.isArray(bloodGroupDemandVsSupply)).toBe(true);
    expect(bloodGroupDemandVsSupply.length).toBe(8);

    const oPos = bloodGroupDemandVsSupply.find((b) => b.bloodGroup === 'O+');
    expect(oPos).toBeDefined();
    expect(oPos.demandedUnits).toBe(2);
    expect(oPos.suppliedUnits).toBe(3); // 2 units today + 1 unit last month
    expect(oPos.availableStock).toBe(25);
    expect(oPos.status).toBe('SURPLUS');
    expect(oPos.fulfillmentRate).toBe(100);

    const bPos = bloodGroupDemandVsSupply.find((b) => b.bloodGroup === 'B+');
    expect(bPos).toBeDefined();
    expect(bPos.demandedUnits).toBe(3);
    expect(bPos.suppliedUnits).toBe(0);
    expect(bPos.status).toBe('DEFICIT');
  });

  it('should calculate top donors ranked by units/donations with user details', () => {
    const { topDonors } = reportData;
    expect(Array.isArray(topDonors)).toBe(true);
    expect(topDonors.length).toBeGreaterThanOrEqual(2);

    // Aman Khan donated 3 units, Pooja Verma donated 3 units
    const donorNames = topDonors.map((d) => d.name);
    expect(donorNames).toContain('Aman Khan');
    expect(donorNames).toContain('Pooja Verma');

    const topOne = topDonors[0];
    expect(topOne).toHaveProperty('donorId');
    expect(topOne).toHaveProperty('name');
    expect(topOne).toHaveProperty('email');
    expect(topOne).toHaveProperty('bloodGroup');
    expect(topOne).toHaveProperty('totalUnits');
    expect(topOne.totalUnits).toBeGreaterThanOrEqual(3);
  });

  it('should calculate city-wise activity combining requests, donations, and emergencies', () => {
    const { cityWiseActivity } = reportData;
    expect(Array.isArray(cityWiseActivity)).toBe(true);
    expect(cityWiseActivity.length).toBeGreaterThanOrEqual(2);

    const mumbai = cityWiseActivity.find((c) => c.city === 'MUMBAI');
    expect(mumbai).toBeDefined();
    expect(mumbai.requestsCount).toBeGreaterThanOrEqual(2);
    expect(mumbai.donationsCount).toBeGreaterThanOrEqual(2);
    expect(mumbai.emergenciesCount).toBeGreaterThanOrEqual(1);
    expect(mumbai.totalActivity).toBeGreaterThanOrEqual(5);

    const pune = cityWiseActivity.find((c) => c.city === 'PUNE');
    expect(pune).toBeDefined();
    expect(pune.requestsCount).toBeGreaterThanOrEqual(1);
  });

  it('should calculate fulfillment rates for blood requests, emergencies, and overall', () => {
    const { fulfillmentRate } = reportData;
    expect(fulfillmentRate).toBeDefined();
    expect(fulfillmentRate.bloodRequests).toBeDefined();
    expect(fulfillmentRate.emergencies).toBeDefined();
    expect(fulfillmentRate.overall).toBeDefined();

    expect(fulfillmentRate.bloodRequests.totalRequests).toBe(3);
    expect(fulfillmentRate.bloodRequests.fulfilledRequests).toBe(1);
    expect(fulfillmentRate.bloodRequests.fulfillmentRatePercentage).toBeCloseTo(33.3, 0);

    expect(fulfillmentRate.emergencies.totalEmergencies).toBe(1);
    expect(fulfillmentRate.emergencies.fulfilledEmergencies).toBe(1);
    expect(fulfillmentRate.emergencies.fulfillmentRatePercentage).toBe(100);

    expect(fulfillmentRate.overall.totalRequests).toBe(4);
    expect(fulfillmentRate.overall.fulfilledRequests).toBe(2);
    expect(fulfillmentRate.overall.overallFulfillmentRatePercentage).toBe(50);
  });

  it('should calculate average response time for emergencies', () => {
    const { averageEmergencyResponseTime } = reportData;
    expect(averageEmergencyResponseTime).toBeDefined();

    const { donorResponses, emergencyResolution } = averageEmergencyResponseTime;
    expect(donorResponses.totalResponses).toBe(1);
    expect(donorResponses.acceptedCount).toBe(1);
    expect(donorResponses.avgResponseTimeSeconds).toBe(240); // 4 minutes
    expect(donorResponses.avgResponseTimeMinutes).toBe(4);
    expect(donorResponses.avgResponseTimeFormatted).toContain('4m');

    expect(emergencyResolution.fulfilledCount).toBe(1);
    expect(emergencyResolution.avgResolutionTimeMinutes).toBeGreaterThanOrEqual(14);
  });
});

describe('3. Date Range and Type Filtering', () => {
  it('should filter reports within a specific date range', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const res = await request
      .get(`/api/v1/admin/reports?from=${todayStr}&to=${todayStr}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filter.from).toBe(todayStr);

    // Only today's donation should be in donationsPerMonth
    const { donationsPerMonth } = res.body.data;
    const totalTodayDonations = donationsPerMonth.reduce((sum, d) => sum + d.donationsCount, 0);
    expect(totalTodayDonations).toBe(1);
  });

  it('should return only the requested report subsection when type is specified', async () => {
    const res = await request
      .get('/api/v1/admin/reports?type=top-donors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.topDonors).toBeDefined();
    expect(Array.isArray(res.body.data.topDonors)).toBe(true);
  });
});

describe('4. Export Endpoints (/api/v1/admin/reports/:type/export & /reports/:type/export)', () => {
  it('should export PDF report with correct streaming headers on /api/v1/admin/reports/:type/export', async () => {
    const res = await request
      .get('/api/v1/admin/reports/donations-per-month/export?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="lifedrop-report-donations-per-month-.*\.pdf"/);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(500);

    // PDF magic number header check: starts with %PDF-
    const pdfHeader = res.body.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('should export Excel report with correct streaming headers on /api/v1/admin/reports/:type/export', async () => {
    const res = await request
      .get('/api/v1/admin/reports/demand-vs-supply/export?format=excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="lifedrop-report-blood-group-demand-supply-.*\.xlsx"/);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000);
  });

  it('should export comprehensive multi-section report when type is all', async () => {
    const res = await request
      .get('/api/v1/admin/reports/all/export?format=excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(2000);
  });

  it('should stream PDF on direct /reports/:type/export endpoint', async () => {
    const res = await request
      .get('/reports/top-donors/export?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="lifedrop-report-top-donors-.*\.pdf"/);
    expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('should stream Excel on direct /reports/:type/export endpoint', async () => {
    const res = await request
      .get('/reports/city-wise-activity/export?format=excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="lifedrop-report-city-wise-activity-.*\.xlsx"/);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000);
  });
});
