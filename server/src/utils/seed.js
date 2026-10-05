import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  User,
  DonorProfile,
  Hospital,
  BloodBank,
  Inventory,
  EligibilityRule,
  InventoryStockLog,
} from '../models/index.js';
import { connectDB, closeDB } from '../config/db.js';
import { toGeoJSONPoint } from './geo.util.js';

dotenv.config();

export const seedDatabase = async (options = {}) => {
  try {
    const isForce = Boolean(options.force || process.argv.includes('--force'));
    const userCount = await User.countDocuments();
    if (userCount > 0 && !isForce) {
      console.log('Data already exists, skipping seed');
      return;
    }

    console.log('[Seed] Starting complete database seeding...');

    // 0. Clean old seed data
    await User.deleteMany({});
    await DonorProfile.deleteMany({});
    await Hospital.deleteMany({});
    await BloodBank.deleteMany({});
    await Inventory.deleteMany({});
    await InventoryStockLog.deleteMany({});
    await EligibilityRule.deleteMany({});

    // 1. National Eligibility Rules
    const defaultRule = await EligibilityRule.create({
      ruleName: 'National Blood Transfusion Council (NBTC) Criteria 2026',
      minAge: 18,
      maxAge: 65,
      minWeightKg: 45,
      minMaleGapDays: 90,
      minFemaleGapDays: 120,
      minHemoglobin: 12.5,
      isActive: true,
      isDefault: true,
    });
    console.log(`[Seed] Eligibility Rule created: ${defaultRule.ruleName}`);

    // Password hash helper
    const salt = await bcrypt.genSalt(10);
    const hashPassword = async (pwd) => await bcrypt.hash(pwd, salt);

    // 2. Create System Admins
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@blooddonation.org',
      phone: '9800000001',
      passwordHash: await hashPassword('AdminPassword123!'),
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      address: {
        line: 'National Transfusion Command Centre',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      location: toGeoJSONPoint(28.6139, 77.2090),
      lastLogin: new Date(),
    });

    // LifeDrop Portal Admin (matches frontend prefilled UI credentials)
    const portalAdmin = await User.create({
      name: 'LifeDrop Administrator',
      email: 'admin@lifedrop.org',
      phone: '9800000002',
      passwordHash: await hashPassword('Password@123'),
      role: 'ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      address: {
        line: 'LifeDrop Central Operations',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      location: toGeoJSONPoint(19.0760, 72.8777),
      lastLogin: new Date(),
    });
    console.log(`[Seed] 2 Admins created: ${admin.email}, ${portalAdmin.email}`);

    // 3. Create 5 Donors with User and DonorProfile
    const donorSeeds = [
      {
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '9876543211',
        gender: 'FEMALE',
        bloodGroup: 'O+',
        dob: new Date('1998-05-15'),
        weight: 54,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        address: 'Flat 402, Sea View Heights, Colaba',
        lat: 18.9220,
        lng: 72.8347,
        medicalConditions: [],
      },
      {
        name: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '9876543212',
        gender: 'MALE',
        bloodGroup: 'B+',
        dob: new Date('1995-10-20'),
        weight: 68,
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016',
        address: 'H-45, Green Park Main',
        lat: 28.5589,
        lng: 77.2028,
        medicalConditions: [],
      },
      {
        name: 'Ananya Iyer',
        email: 'ananya.iyer@example.com',
        phone: '9876543213',
        gender: 'FEMALE',
        bloodGroup: 'A+',
        dob: new Date('2000-02-14'),
        weight: 52,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        address: '32, MG Road, Ashok Nagar',
        lat: 12.9716,
        lng: 77.5946,
        medicalConditions: [],
      },
      {
        name: 'Vikram Malhotra',
        email: 'vikram.malhotra@example.com',
        phone: '9876543214',
        gender: 'MALE',
        bloodGroup: 'O-', // Universal Donor
        dob: new Date('1992-08-30'),
        weight: 74,
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700016',
        address: '15/B Park Street',
        lat: 22.5555,
        lng: 88.3524,
        medicalConditions: [],
      },
      {
        name: 'Sneha Patel',
        email: 'sneha.patel@example.com',
        phone: '9876543215',
        gender: 'FEMALE',
        bloodGroup: 'AB+', // Universal Recipient
        dob: new Date('1997-12-05'),
        weight: 56,
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380009',
        address: 'B-102, Navrangpura',
        lat: 23.0365,
        lng: 72.5611,
        medicalConditions: [],
      },
    ];

    const donorsCreated = [];
    for (const d of donorSeeds) {
      const donorUser = await User.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash: await hashPassword('SecurePassword123!'),
        role: 'USER',
        isDonor: true,
        status: 'ACTIVE',
        isEmailVerified: true,
        dob: d.dob,
        gender: d.gender,
        bloodGroup: d.bloodGroup,
        address: {
          line: d.address,
          city: d.city,
          state: d.state,
          pincode: d.pincode,
        },
        location: toGeoJSONPoint(d.lat, d.lng),
        lastLogin: new Date(),
      });

      const donorProfile = await DonorProfile.create({
        user: donorUser._id,
        bloodGroup: d.bloodGroup,
        weight: d.weight,
        dob: d.dob,
        isAvailable: true,
        lastDonationDate: new Date(Date.now() - 130 * 24 * 60 * 60 * 1000), // 130 days ago (satisfies 90d male & 120d female gap)
        nextEligibleDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Eligible immediately
        medicalConditions: d.medicalConditions,
        verificationStatus: 'VERIFIED',
        isVerified: true,
        totalDonations: 3,
        location: toGeoJSONPoint(d.lat, d.lng),
      });

      donorsCreated.push({ user: donorUser, profile: donorProfile });
    }
    console.log(`[Seed] 5 Donors created successfully with linked DonorProfiles`);

    // 4. Create 2 Hospitals
    const hospitalSeeds = [
      {
        userName: 'Max Healthcare Coordinator',
        email: 'max.hospital@example.com',
        phone: '9811223301',
        hospitalName: 'Max Super Speciality Hospital',
        licenseNumber: 'MAX-HOSP-2026-DEL',
        licenseDocUrl: '/uploads/licenses/max-license.pdf',
        address: '1, 2, Press Enclave Marg, Saket',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        lat: 28.5284,
        lng: 77.2132,
      },
      {
        userName: 'Lilavati Hospital Administrator',
        email: 'lilavati.hospital@example.com',
        phone: '9811223302',
        hospitalName: 'Lilavati Hospital & Research Centre',
        licenseNumber: 'LIL-HOSP-2026-MUM',
        licenseDocUrl: '/uploads/licenses/lilavati-cert.pdf',
        address: 'A-791, Bandra Reclamation, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        lat: 19.0522,
        lng: 72.8258,
      },
    ];

    const hospitalsCreated = [];
    for (const h of hospitalSeeds) {
      const hospUser = await User.create({
        name: h.userName,
        email: h.email,
        phone: h.phone,
        passwordHash: await hashPassword('HospitalPass123!'),
        role: 'HOSPITAL',
        status: 'ACTIVE',
        isEmailVerified: true,
        address: {
          line: h.address,
          city: h.city,
          state: h.state,
          pincode: h.pincode,
        },
        location: toGeoJSONPoint(h.lat, h.lng),
      });

      const hospDoc = await Hospital.create({
        user: hospUser._id,
        name: h.hospitalName,
        licenseNumber: h.licenseNumber,
        licenseDocUrl: h.licenseDocUrl,
        address: {
          line: h.address,
          city: h.city,
          state: h.state,
          pincode: h.pincode,
        },
        contact: {
          phone: h.phone,
          email: h.email,
          emergencyContact: '+91-11-26515050',
        },
        verificationStatus: 'VERIFIED',
        isVerified: true,
        location: toGeoJSONPoint(h.lat, h.lng),
      });

      hospitalsCreated.push(hospDoc);
    }
    console.log(`[Seed] 2 Hospitals created successfully`);

    // 5. Create 2 Blood Banks
    const bloodBankSeeds = [
      {
        userName: 'AIIMS Transfusion Officer',
        email: 'aiims.bloodbank@example.com',
        phone: '9822334401',
        bankName: 'AIIMS Central Blood Transfusion Centre',
        licenseNumber: 'AIIMS-BB-2026-001',
        licenseDocUrl: '/uploads/licenses/aiims-license.pdf',
        address: 'Ansari Nagar East, Ring Road',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110029',
        operatingHours: '24/7 Emergency Support',
        lat: 28.5672,
        lng: 77.2104,
      },
      {
        userName: 'KEM Blood Transfusion Officer',
        email: 'kem.bloodbank@example.com',
        phone: '9822334402',
        bankName: 'KEM Municipal Blood Bank',
        licenseNumber: 'KEM-BB-2026-002',
        licenseDocUrl: '/uploads/licenses/kem-license.pdf',
        address: 'Acharya Donde Marg, Parel',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400012',
        operatingHours: '24/7 Emergency Support',
        lat: 19.0028,
        lng: 72.8427,
      },
    ];

    const bloodBanksCreated = [];
    for (const b of bloodBankSeeds) {
      const bbUser = await User.create({
        name: b.userName,
        email: b.email,
        phone: b.phone,
        passwordHash: await hashPassword('BloodBankPass123!'),
        role: 'BLOOD_BANK',
        status: 'ACTIVE',
        isEmailVerified: true,
        address: {
          line: b.address,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
        },
        location: toGeoJSONPoint(b.lat, b.lng),
      });

      const bbDoc = await BloodBank.create({
        user: bbUser._id,
        name: b.bankName,
        licenseNumber: b.licenseNumber,
        licenseDocUrl: b.licenseDocUrl,
        address: {
          line: b.address,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
        },
        contact: {
          phone: b.phone,
          email: b.email,
          emergencyContact: '+91-22-24107000',
        },
        operatingHours: b.operatingHours,
        verificationStatus: 'VERIFIED',
        isVerified: true,
        location: toGeoJSONPoint(b.lat, b.lng),
      });

      bloodBanksCreated.push(bbDoc);
    }
    console.log(`[Seed] 2 Blood Banks created successfully`);

    // 6. Create Inventory for both Blood Banks across all 8 blood groups
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const stockQuantities = {
      'A+': 18,
      'A-': 6,
      'B+': 24,
      'B-': 5,
      'AB+': 8,
      'AB-': 3, // intentionally low for testing alerts (< 5)
      'O+': 32,
      'O-': 4,  // intentionally low for testing alerts (< 5)
    };

    let totalInventoriesCreated = 0;
    for (const bb of bloodBanksCreated) {
      for (const bg of bloodGroups) {
        const available = stockQuantities[bg] || 10;
        const reserved = Math.floor(available * 0.15);
        const expired = 1;
        const total = available + reserved + expired;

        // Generate sample batches
        const batches = [];
        for (let i = 0; i < available; i++) {
          batches.push({
            unitId: `UNIT-${bg.replace('+', 'POS').replace('-', 'NEG')}-${Date.now()}-${i + 1}`,
            bloodGroup: bg,
            collectedDate: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
            expiryDate: new Date(Date.now() + (42 - i - 2) * 24 * 60 * 60 * 1000), // 42-day lifespan
            status: 'AVAILABLE',
          });
        }

        const inv = await Inventory.create({
          bloodBank: bb._id,
          bloodGroup: bg,
          available,
          reserved,
          expired,
          unitsTotalCollected: total,
          lowStockThreshold: 5,
          lastUpdated: new Date(),
          batches,
        });

        await InventoryStockLog.create({
          inventoryId: inv._id,
          bloodBankId: bb._id,
          bloodGroup: bg,
          changeType: 'ADD',
          units: available,
          previousAvailableUnits: 0,
          newAvailableUnits: available,
          performedBy: admin._id,
          reason: 'Initial system inventory stock provision',
        });

        totalInventoriesCreated++;
      }
    }

    console.log(`[Seed] Provisioned ${totalInventoriesCreated} Blood Inventory records (all 8 blood groups for both facilities)`);
    console.log('[Seed] Database seeding completed successfully!\n');

    console.log('========================================================================================');
    console.log('                        TEST LOGIN CREDENTIALS                                          ');
    console.log('========================================================================================');
    console.log('1. ADMINISTRATORS:');
    console.log('   - Email: admin@blooddonation.org | Password: AdminPassword123! | Role: ADMIN');
    console.log('   - Email: admin@lifedrop.org      | Password: Password@123      | Role: ADMIN');
    console.log('\n2. VERIFIED VOLUNTARY DONORS (role: USER, isDonor: true, verificationStatus: VERIFIED):');
    console.log('   - Email: priya.sharma@example.com   | Password: SecurePassword123! | Blood: O+  | Female');
    console.log('   - Email: rahul.verma@example.com    | Password: SecurePassword123! | Blood: B+  | Male');
    console.log('   - Email: ananya.iyer@example.com    | Password: SecurePassword123! | Blood: A+  | Female');
    console.log('   - Email: vikram.malhotra@example.com| Password: SecurePassword123! | Blood: O-  | Male');
    console.log('   - Email: sneha.patel@example.com    | Password: SecurePassword123! | Blood: AB+ | Female');
    console.log('\n3. VERIFIED BLOOD BANKS (role: BLOOD_BANK, verificationStatus: VERIFIED):');
    console.log('   - Email: aiims.bloodbank@example.com| Password: BloodBankPass123! | Facility: AIIMS Central');
    console.log('   - Email: kem.bloodbank@example.com  | Password: BloodBankPass123! | Facility: KEM Municipal');
    console.log('\n4. VERIFIED HOSPITALS (role: HOSPITAL, verificationStatus: VERIFIED):');
    console.log('   - Email: max.hospital@example.com   | Password: HospitalPass123!  | Facility: Max Super Speciality');
    console.log('   - Email: lilavati.hospital@example.com | Password: HospitalPass123! | Facility: Lilavati Hospital');
    console.log('========================================================================================\n');

    return {
      admin,
      donorsCount: donorsCreated.length,
      hospitalsCount: hospitalsCreated.length,
      bloodBanksCount: bloodBanksCreated.length,
      inventoriesCount: totalInventoriesCreated,
    };
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    throw error;
  }
};

// If executed directly from command line (npm run seed)
const isMainScript = process.argv[1] && (
  process.argv[1].endsWith('seed.js') ||
  process.argv[1].endsWith('seed.mjs')
);

if (isMainScript) {
  connectDB()
    .then(async () => {
      await seedDatabase();
      await closeDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding script failed:', err);
      process.exit(1);
    });
}
