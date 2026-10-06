import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blood_donation_db';

async function runCleanup() {
  console.log('================================================================');
  console.log('  ONE-TIME DATA CLEANUP: HOSPITAL OBJECTID LINKING');
  console.log('================================================================');
  
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // 1. Locate and activate real Hospital documents
  const hospitals = await db.collection('hospitals').find({}).toArray();
  console.log(`\nFound ${hospitals.length} Hospital record(s) in registry:`);
  hospitals.forEach((h) => console.log(` - ID: ${h._id} | Name: "${h.name}" | Status: ${h.verificationStatus}`));

  let lokeshHospital = hospitals.find((h) => /lokesh/i.test(h.name));
  const maxHospital = hospitals.find((h) => /max/i.test(h.name));
  const lilavatiHospital = hospitals.find((h) => /lilavati/i.test(h.name));

  // If Lokesh Hospital exists, ensure clean verified status & known password for Phase 5 verification
  if (lokeshHospital) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('HospitalPass123!', salt);

    await db.collection('hospitals').updateOne(
      { _id: lokeshHospital._id },
      {
        $set: {
          name: 'Lokesh Hospital',
          verificationStatus: 'VERIFIED',
          isVerified: true,
          status: 'ACTIVE',
        },
      }
    );

    if (lokeshHospital.user) {
      await db.collection('users').updateOne(
        { _id: lokeshHospital.user },
        {
          $set: {
            name: 'Lokesh Hospital',
            status: 'ACTIVE',
            isEmailVerified: true,
            isVerified: true,
            passwordHash,
            password: passwordHash,
          },
        }
      );
      console.log(`\n✓ Activated & verified Lokesh Hospital account (User ID: ${lokeshHospital.user}) with test password: HospitalPass123!`);
    }

    // Refresh reference
    lokeshHospital = await db.collection('hospitals').findOne({ _id: lokeshHospital._id });
  }

  // 2. Scan BloodRequests and link missing/stale hospital ObjectIds
  const requests = await db.collection('bloodrequests').find({}).toArray();
  console.log(`\nScanning ${requests.length} BloodRequest records for hospital linking...`);

  let updatedCount = 0;
  const updateLogs = [];

  for (const req of requests) {
    const originalHospital = req.hospital ? req.hospital.toString() : 'null';
    let targetHospitalId = null;
    let targetHospitalName = req.hospitalName || '';

    if (req.hospitalName && /lokesh/i.test(req.hospitalName)) {
      if (lokeshHospital) {
        targetHospitalId = lokeshHospital._id;
        targetHospitalName = 'Lokesh Hospital';
      }
    } else if (req.hospitalName && /max/i.test(req.hospitalName)) {
      if (maxHospital) {
        targetHospitalId = maxHospital._id;
        targetHospitalName = 'Max Super Speciality Hospital';
      }
    } else if (req.hospitalName && /lilavati/i.test(req.hospitalName)) {
      if (lilavatiHospital) {
        targetHospitalId = lilavatiHospital._id;
        targetHospitalName = 'Lilavati Hospital & Research Centre';
      }
    }

    // Update if target hospital identified and currently missing or pointing to stale id
    if (targetHospitalId && (!req.hospital || req.hospital.toString() !== targetHospitalId.toString())) {
      await db.collection('bloodrequests').updateOne(
        { _id: req._id },
        {
          $set: {
            hospital: targetHospitalId,
            hospitalName: targetHospitalName,
          },
        }
      );

      const logMsg = `Request [${req._id}] Patient: "${req.patientName}" | Hospital text: "${req.hospitalName}" | Old hospital: ${originalHospital} -> New ObjectId: ${targetHospitalId} (${targetHospitalName})`;
      updateLogs.push(logMsg);
      console.log(`  ✓ ${logMsg}`);
      updatedCount++;
    }
  }

  console.log('\n================================================================');
  console.log(`  CLEANUP COMPLETE: ${updatedCount} blood request(s) updated.`);
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runCleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
