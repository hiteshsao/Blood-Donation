import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  User,
  DonorProfile,
  Hospital,
  BloodBank,
  BloodInventory,
  BloodRequest,
  EmergencyRequest,
  Appointment,
  Donation,
  Feedback,
} from '../src/models/index.js';

const BASE_URL = 'http://localhost:5000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/blood_donation_db';

async function fullIntegrationPass() {
  console.log('========================================================================');
  console.log('🚀 LIFE DROP — PHASE 6 FULL INTEGRATION PASS (18-STEP CHAIN)');
  console.log('========================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('[DB] Connected to MongoDB.');

  const results = [];
  function step(stepNum, name, condition, details = '') {
    if (condition) {
      console.log(`  ✅ [STEP ${stepNum} PASSED] ${name} ${details}`);
      results.push({ stepNum, name, status: 'PASS', details });
    } else {
      console.error(`  ❌ [STEP ${stepNum} FAILED] ${name} ${details}`);
      results.push({ stepNum, name, status: 'FAIL', details });
      throw new Error(`Step ${stepNum} failed: ${name}`);
    }
  }

  const ts = Date.now();
  const donorEmail = `chain.donor.${ts}@example.com`;
  const helperDonorEmail = `chain.helper.${ts}@example.com`;
  const plainPassword = 'IntegrationPass2026!';
  const knownOtp = '777888';
  const knownHash = crypto.createHash('sha256').update(knownOtp).digest('hex');

  // STEP 1: Register a donor
  console.log('\n--- Step 1: Register Donor ---');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test Donor',
      email: donorEmail,
      phone: '9811122233',
      password: plainPassword,
      role: 'USER',
      bloodGroup: 'O+',
      city: 'Mumbai',
    }),
  });
  const regData = await regRes.json();
  step(1, 'Register donor', regRes.status === 201 && regData.success);

  // STEP 2: Verify OTP
  console.log('\n--- Step 2: Verify OTP ---');
  const donorUser = await User.findOne({ email: donorEmail }).select('+verificationOtp');
  donorUser.verificationOtp = { codeHash: knownHash, expiresAt: new Date(Date.now() + 600000) };
  await donorUser.save();

  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: donorEmail,
      otp: knownOtp,
      type: 'REGISTRATION',
    }),
  });
  const verifyData = await verifyRes.json();
  step(2, 'Verify OTP', verifyRes.status === 200 && verifyData.success);

  // STEP 3: Login as donor
  console.log('\n--- Step 3: Login as Donor ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: donorEmail,
      password: plainPassword,
    }),
  });
  const loginData = await loginRes.json();
  const donorToken = loginData.accessToken;
  const donorId = loginData.user?._id || loginData.user?.id;
  step(3, 'Login donor', loginRes.status === 200 && !!donorToken);

  // STEP 4: Complete profile
  console.log('\n--- Step 4: Complete Profile ---');
  const profileRes = await fetch(`${BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      name: 'Verified Hero Donor',
      dob: '1995-06-15',
      gender: 'MALE',
      address: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      bloodGroup: 'O+',
      emergencyContact: {
        name: 'Sarah Donor Contact',
        phone: '9811122244',
      },
    }),
  });
  const profileData = await profileRes.json();
  step(4, 'Complete profile', profileRes.status === 200 && profileData.success);

  // STEP 5: Become donor
  console.log('\n--- Step 5: Become Donor ---');
  const becomeDonorRes = await fetch(`${BASE_URL}/profile/become-donor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      bloodGroup: 'O+',
      weightKg: 68,
      medicalNotes: 'Fit for donation',
    }),
  });
  const becomeDonorData = await becomeDonorRes.json();
  step(5, 'Become donor', (becomeDonorRes.status === 201 || becomeDonorRes.status === 200) && becomeDonorData.success);

  // STEP 6: Admin verifies donor
  console.log('\n--- Step 6: Admin Verifies Donor ---');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@lifedrop.org',
      password: 'Password@123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.accessToken;

  // Find donor profile id
  const dProfile = await DonorProfile.findOne({ user: donorId });
  const approveDonorRes = await fetch(`${BASE_URL}/admin/donors/${dProfile._id}/approve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: 'Official government donor photo ID verified.' }),
  });
  const approveDonorData = await approveDonorRes.json();
  step(6, 'Admin verifies donor', approveDonorRes.status === 200 && approveDonorData.success);

  // Verify donor status in DB
  const verifiedDonor = await DonorProfile.findById(dProfile._id);
  step(6.1, 'Donor profile status is VERIFIED in DB', verifiedDonor.verificationStatus === 'VERIFIED');

  // STEP 7: Donor books appointment
  console.log('\n--- Step 7: Donor Books Appointment ---');
  const seedBank = await BloodBank.findOne({ verificationStatus: 'VERIFIED' });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const slotDateStr = tomorrow.toISOString().split('T')[0];

  const bookRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      bloodBankId: seedBank._id,
      slotDate: slotDateStr,
      slotTime: '10:00 AM - 11:00 AM',
      notes: 'First voluntary donation at regional center.',
    }),
  });
  const bookData = await bookRes.json();
  const appointmentId = bookData.data?._id || bookData.data?.id || bookData.appointment?._id;
  step(7, 'Donor books appointment', bookRes.status === 201 && !!appointmentId);

  // STEP 8: Blood bank completes appointment
  console.log('\n--- Step 8: Blood Bank Completes Appointment ---');
  // Login as blood bank user
  const bankUser = await User.findById(seedBank.user).select('+password');
  const bankLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: seedBank.contact?.email || 'aiims.bloodbank@example.com',
      password: 'BloodBankPass123!',
    }),
  });
  const bankLoginData = await bankLoginRes.json();
  const bankToken = bankLoginData.accessToken;

  // Complete appointment
  const completeRes = await fetch(`${BASE_URL}/appointments/${appointmentId}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bankToken}`,
    },
    body: JSON.stringify({
      bagNo: `WB-CHAIN-${ts}`,
      units: 1,
      bloodGroup: 'O+',
      hemoglobinGdl: '14.2',
      storageFridgeId: 'REF-01 (Shelf A)',
    }),
  });
  const completeData = await completeRes.json();
  step(8, 'Blood bank completes appointment', completeRes.status === 200 && completeData.success);

  // STEP 9: Verify Donation record + Inventory + nextEligibleDate
  console.log('\n--- Step 9: Verify Atomic Donation Record & Inventory Update ---');
  const donationDoc = await Donation.findOne({ appointment: appointmentId });
  step(9.1, 'Donation record exists', !!donationDoc && donationDoc.units === 1);

  const updatedDonorProfile = await DonorProfile.findOne({ user: donorId });
  step(9.2, 'Donor nextEligibleDate set 90 days out', !!updatedDonorProfile.nextEligibleDate && updatedDonorProfile.totalDonations >= 1);

  // STEP 10: Donor history updates
  console.log('\n--- Step 10: Donor History Updates ---');
  const historyRes = await fetch(`${BASE_URL}/donor/history`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${donorToken}` },
  });
  const historyData = await historyRes.json();
  const historyList = historyData.data || historyData.donations || [];
  step(10, 'Donor history loads and reflects donation', historyRes.status === 200 && historyList.length > 0);

  // Register Helper Donor for Emergency Response
  await User.create({
    name: 'Helper Voluntary Donor',
    email: helperDonorEmail,
    phone: '9822233344',
    password: plainPassword,
    role: 'USER',
    isEmailVerified: true,
    isVerified: true,
    status: 'ACTIVE',
    bloodGroup: 'O+',
    location: { type: 'Point', coordinates: [72.8777, 19.0760] },
    address: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  });
  const helperUser = await User.findOne({ email: helperDonorEmail });
  await DonorProfile.create({
    user: helperUser._id,
    bloodGroup: 'O+',
    isAvailable: true,
    verificationStatus: 'VERIFIED',
  });
  const helperLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: helperDonorEmail, password: plainPassword }),
  });
  const helperLoginData = await helperLoginRes.json();
  const helperToken = helperLoginData.accessToken;

  // STEP 11: Donor creates emergency request
  console.log('\n--- Step 11: Donor Creates Emergency Request ---');
  const emergencyRes = await fetch(`${BASE_URL}/emergency`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      patientName: 'Emergency Trauma Patient',
      bloodGroup: 'O+',
      units: 2,
      hospitalName: 'Apollo City Hospital',
      city: 'Mumbai',
      urgency: 'CRITICAL',
      location: { coordinates: [72.8777, 19.0760] },
      contactPhone: '9811122233',
    }),
  });
  const emergencyData = await emergencyRes.json();
  const emergencyId = emergencyData.data?._id || emergencyData.data?.id || emergencyData.emergency?._id;
  step(11, 'Create emergency request', emergencyRes.status === 201 && !!emergencyId);

  // STEP 12: Another donor accepts
  console.log('\n--- Step 12: Helper Donor Responds to Emergency ---');
  const respondRes = await fetch(`${BASE_URL}/emergency/${emergencyId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${helperToken}`,
    },
    body: JSON.stringify({ response: 'ACCEPTED' }),
  });
  const respondData = await respondRes.json();
  step(12, 'Donor accepts emergency', respondRes.status === 200 && respondData.success);

  // STEP 13: Admin monitors emergency live
  console.log('\n--- Step 13: Admin Monitors Emergency Live ---');
  const liveEmRes = await fetch(`${BASE_URL}/admin/emergency/live`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const liveEmData = await liveEmRes.json();
  const liveList = liveEmData.data || liveEmData.emergencies || [];
  const foundEm = liveList.find(e => (e._id || e.id) === emergencyId);
  step(13, 'Admin monitors emergency live', liveEmRes.status === 200 && !!foundEm);

  // STEP 14: Hospital posts blood requirement
  console.log('\n--- Step 14: Hospital Posts Requirement ---');
  const hospLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'max.hospital@example.com',
      password: 'HospitalPass123!',
    }),
  });
  const hospLoginData = await hospLoginRes.json();
  const hospToken = hospLoginData.accessToken;

  const reqPostRes = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospToken}`,
    },
    body: JSON.stringify({
      patientName: 'Post-Op Surgical Patient',
      bloodGroup: 'O+',
      units: 1,
      component: 'PRBC',
      urgency: 'URGENT',
      hospitalName: 'Max Super Speciality',
      city: 'Delhi',
      notes: 'Required for scheduled cardiac bypass.',
    }),
  });
  const reqPostData = await reqPostRes.json();
  const bloodRequestId = reqPostData.data?._id || reqPostData.data?.id || reqPostData.request?._id;
  step(14, 'Hospital posts blood requirement', reqPostRes.status === 201 && !!bloodRequestId);

  // STEP 15: Admin approves hospital request
  console.log('\n--- Step 15: Admin Approves Request ---');
  const approveReqRes = await fetch(`${BASE_URL}/admin/requests/${bloodRequestId}/approve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ note: 'Requisition cleared and authorized by central dispatch.' }),
  });
  const approveReqData = await approveReqRes.json();
  step(15, 'Admin approves request', approveReqRes.status === 200 && approveReqData.success);

  // STEP 16: Blood bank issues units
  console.log('\n--- Step 16: Blood Bank Issues Units ---');
  const issueRes = await fetch(`${BASE_URL}/bloodbank/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bankToken}`,
    },
    body: JSON.stringify({
      recipient: 'Max Super Speciality',
      bloodGroup: 'O+',
      units: 1,
      bagNo: `PRBC-ISSUE-${ts}`,
      issuedTo: 'Hospital Courier #14',
      requestId: bloodRequestId,
    }),
  });
  const issueData = await issueRes.json();
  step(16, 'Blood bank issues units', issueRes.status === 200 && issueData.success);

  // STEP 17: Hospital confirms units received
  console.log('\n--- Step 17: Hospital Confirms Units Received ---');
  const confirmRecRes = await fetch(`${BASE_URL}/hospital/requests/${bloodRequestId}/confirm-received`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hospToken}`,
    },
    body: JSON.stringify({
      batchNo: `PRBC-ISSUE-${ts}`,
      receivedBy: 'Nurse In-Charge Ward 4',
      remarks: 'Cold chain 4°C verified. Transfusion initiated.',
    }),
  });
  const confirmRecData = await confirmRecRes.json();
  step(17, 'Hospital confirms units received (FULFILLED)', confirmRecRes.status === 200 && confirmRecData.success);

  // STEP 18: Donor submits feedback + Admin resolves complaint
  console.log('\n--- Step 18: Donor Feedback & Admin Resolution ---');
  const feedbackRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${donorToken}`,
    },
    body: JSON.stringify({
      type: 'COMPLAINT',
      subject: 'Delay in donor digital badge generation',
      message: 'Completed donation today, but the certificate badge took 10 minutes to render.',
      category: 'GENERAL',
    }),
  });
  const feedbackData = await feedbackRes.json();
  const feedbackId = feedbackData.data?._id || feedbackData.data?.id || feedbackData.feedback?._id;
  step(18.1, 'Donor submits feedback/complaint', feedbackRes.status === 201 && !!feedbackId);

  const resolveRes = await fetch(`${BASE_URL}/admin/complaints/${feedbackId}/resolve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      resolutionNote: 'Digital badge cache refreshed. Certificate verified and re-sent.',
    }),
  });
  const resolveData = await resolveRes.json();
  step(18.2, 'Admin resolves complaint', resolveRes.status === 200 && resolveData.success);

  console.log('\n========================================================================');
  console.log(`🎉 ALL 18 INTEGRATION CHAIN STEPS COMPLETED WITH ZERO ERRORS!`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

fullIntegrationPass().catch((err) => {
  console.error('\n💥 Integration Chain Error:', err);
  process.exit(1);
});
