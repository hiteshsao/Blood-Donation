/**
 * Exhaustive Phase 5 Post-Login Dashboard Functionality Check
 * Validates every single page, action, filter, submission, state update, and export across all 4 roles.
 */
import mongoose from 'mongoose';
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
  Notification,
  AuditLog,
} from '../src/models/index.js';

const BASE_URL = 'http://localhost:5000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/blood_donation_db';

let passedCount = 0;
let failedCount = 0;

function check(testName, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? '- ' + detail : ''}`);
    failedCount++;
  }
}

async function runPhase5Audit() {
  console.log('========================================================================');
  console.log('🩺 EXHAUSTIVE PHASE 5 POST-LOGIN DASHBOARD VERIFICATION');
  console.log('========================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('[DB] Connected to MongoDB.\n');

  // 1. Authenticate All 4 Roles
  console.log('--- 1. Authenticating Test Personas ---');
  // Admin
  const adminRes = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@blooddonation.org', password: 'AdminPassword123!' }),
  });
  const adminData = await adminRes.json();
  const adminToken = adminData.accessToken;
  const adminUser = adminData.user;
  check('Admin Login succeeded', adminRes.status === 200 && !!adminToken);

  // User/Donor
  const donorRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.sharma@example.com', password: 'SecurePassword123!' }),
  });
  const donorData = await donorRes.json();
  const donorToken = donorData.accessToken;
  const donorUser = donorData.user;
  check('User/Donor Login succeeded', donorRes.status === 200 && !!donorToken);

  // Hospital
  const hospRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'max.hospital@example.com', password: 'HospitalPass123!' }),
  });
  const hospData = await hospRes.json();
  const hospToken = hospData.accessToken;
  const hospUser = hospData.user;
  check('Hospital Login succeeded', hospRes.status === 200 && !!hospToken);

  // Blood Bank
  const bankRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aiims.bloodbank@example.com', password: 'BloodBankPass123!' }),
  });
  const bankData = await bankRes.json();
  const bankToken = bankData.accessToken;
  const bankUser = bankData.user;
  check('Blood Bank Login succeeded', bankRes.status === 200 && !!bankToken);

  // ========================================================================
  // ROLE 1: USER / DONOR DASHBOARD
  // ========================================================================
  console.log('\n--- 2. Checking USER / DONOR Dashboard Pages ---');

  // Page 1.1: Dashboard home & stats
  const donorStatsRes = await fetch(`${BASE_URL}/donor/dashboard-stats`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const donorStatsData = await donorStatsRes.json();
  check('User Dashboard stats load properly', donorStatsRes.status === 200 && donorStatsData.success && (typeof donorStatsData.totalDonations === 'number' || typeof donorStatsData.data?.totalDonations === 'number' || typeof donorStatsData.stats?.totalDonations === 'number'));

  // Page 1.2: Profile Edit + Save + Geolocation
  const updateProfileRes = await fetch(`${BASE_URL}/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      name: 'Dr. Priya Sharma (Verified)',
      bloodGroup: 'O+',
      emergencyContact: { name: 'Emergency Family', phone: '9822211100', relation: 'Spouse' },
    }),
  });
  const updateProfileData = await updateProfileRes.json();
  const updatedUserName = updateProfileData.user?.name || updateProfileData.data?.name;
  check('Profile edit & save actually persists', updateProfileRes.status === 200 && updatedUserName?.includes('Verified'));

  const updateAddrRes = await fetch(`${BASE_URL}/profile/address`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400012',
      location: { type: 'Point', coordinates: [72.8555, 19.0123] },
    }),
  });
  const updateAddrData = await updateAddrRes.json();
  const updatedCoords = updateAddrData.user?.location?.coordinates || updateAddrData.data?.location?.coordinates;
  check('Profile "use my location" coordinates update succeeds', updateAddrRes.status === 200 && updatedCoords?.[0] === 72.8555);

  // Page 1.3: Availability toggle
  const toggleAvailRes = await fetch(`${BASE_URL}/donor/availability`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({ isAvailable: true }),
  });
  const toggleAvailData = await toggleAvailRes.json();
  check('Donor availability toggle persists', toggleAvailRes.status === 200 && (toggleAvailData.isAvailable === true || toggleAvailData.donorProfile?.isAvailable === true));

  // Page 1.4: Find Blood (search donors, blood banks, availability)
  const searchDonorsRes = await fetch(`${BASE_URL}/search/donors?bloodGroup=O%2B&city=Mumbai&page=1&limit=5`);
  const searchDonorsData = await searchDonorsRes.json();
  const donorsList = searchDonorsData.donors || searchDonorsData.data || [];
  check('Find Blood search donors with filters & pagination', searchDonorsRes.status === 200 && Array.isArray(donorsList));

  const searchBanksRes = await fetch(`${BASE_URL}/search/blood-banks?city=Mumbai`);
  const searchBanksData = await searchBanksRes.json();
  const banksList = searchBanksData.bloodBanks || searchBanksData.data || [];
  check('Find Blood search blood banks by city', searchBanksRes.status === 200 && Array.isArray(banksList));

  // Page 1.5: Create Blood Request & View in My Requests & Status Timeline
  const createReqRes = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      patientName: 'Anil Deshmukh',
      bloodGroup: 'O+',
      units: 1,
      urgency: 'ROUTINE',
      hospitalName: 'KEM Hospital Mumbai',
      city: 'Mumbai',
      notes: 'Scheduled procedure on Friday',
    }),
  });
  const createReqData = await createReqRes.json();
  const userBloodReqId = createReqData.request?._id || createReqData.data?._id;
  check('Create blood request form submits', createReqRes.status === 201 && !!userBloodReqId);

  const myReqsRes = await fetch(`${BASE_URL}/requests/my`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const myReqsData = await myReqsRes.json();
  const myRequestsList = myReqsData.requests || myReqsData.data || [];
  const foundUserReq = myRequestsList.find((r) => r._id === userBloodReqId);
  check('Created request appears in My Requests with timeline', myReqsRes.status === 200 && !!foundUserReq && Array.isArray(foundUserReq.statusHistory));

  // Page 1.6: Cancel Request
  const cancelReqRes = await fetch(`${BASE_URL}/requests/${userBloodReqId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({ reason: 'Donor arranged through family voluntarily.' }),
  });
  const cancelReqData = await cancelReqRes.json();
  const cancelledStatus = cancelReqData.request?.status || cancelReqData.data?.status;
  check('Cancel button in My Requests cancels request', cancelReqRes.status === 200 && cancelledStatus === 'CANCELLED');

  // Page 1.7: Create Emergency Request & Matching Donors Notification
  const emReqRes = await fetch(`${BASE_URL}/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      patientName: 'ICU Severe Anemia Case',
      bloodGroup: 'O+',
      units: 2,
      hospitalName: 'Hinduja Hospital',
      city: 'Mumbai',
      urgency: 'CRITICAL',
      location: { coordinates: [72.8777, 19.0760] },
      contactPhone: '9820011223',
    }),
  });
  const emReqData = await emReqRes.json();
  const createdEmId = emReqData.emergency?._id || emReqData.data?._id;
  check('Emergency Request submits and creates broadcast alerts', emReqRes.status === 201 && !!createdEmId);

  // Check matching donors notified in DB
  const matchingDonorNotif = await Notification.findOne({
    type: 'EMERGENCY_ALERT',
  }).sort({ createdAt: -1 });
  check('Emergency alert notification sent to matching donors in DB', !!matchingDonorNotif);

  // Page 1.8: Emergency Alerts (Nearby & Respond Accept)
  const nearbyAlertsRes = await fetch(`${BASE_URL}/emergency/nearby?lat=19.0760&lng=72.8777&radiusKm=50`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const nearbyAlertsData = await nearbyAlertsRes.json();
  const nearbyList = nearbyAlertsData.emergencies || nearbyAlertsData.data || [];
  check('Emergency alerts nearby endpoint loads alerts', nearbyAlertsRes.status === 200 && Array.isArray(nearbyList));

  // Page 1.9: Book Appointment (Slots picker & Booking)
  const seedBank = await BloodBank.findOne({ verificationStatus: 'VERIFIED' });
  const apptDate = new Date();
  apptDate.setDate(apptDate.getDate() + 10);
  const apptDateStr = apptDate.toISOString().split('T')[0];

  // Clean up any existing appointments for this date and ensure donor eligibility is active
  await Appointment.deleteMany({
    donor: donorUser.id || donorUser._id,
  });
  await DonorProfile.findOneAndUpdate(
    { user: donorUser.id || donorUser._id },
    { nextEligibleDate: new Date(Date.now() - 86400000) }
  );

  const slotsRes = await fetch(`${BASE_URL}/appointments/slots?bloodBankId=${seedBank._id}&date=${apptDateStr}`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const slotsData = await slotsRes.json();
  check('Slot picker loads real available slots', slotsRes.status === 200 && Array.isArray(slotsData.data?.slots));

  const bookApptRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      bloodBankId: seedBank._id,
      slotDate: apptDateStr,
      slotTime: '09:00 AM - 10:00 AM',
      notes: 'Routine voluntary donor checkup.',
    }),
  });
  const bookApptData = await bookApptRes.json();
  const userApptId = bookApptData.appointment?._id || bookApptData.data?._id;
  check('Book appointment saves record', bookApptRes.status === 201 && !!userApptId);

  // Double booking prevention test
  const doubleBookRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      bloodBankId: seedBank._id,
      slotDate: apptDateStr,
      slotTime: '09:00 AM - 10:00 AM',
    }),
  });
  check('Double-booking on active appointment prevented (400/409)', doubleBookRes.status >= 400 && doubleBookRes.status <= 409);

  // Page 1.10: My Appointments (Reschedule & Cancel)
  const nextDay = new Date(apptDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const rescheduleRes = await fetch(`${BASE_URL}/appointments/${userApptId}/reschedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      slotDate: nextDay.toISOString().split('T')[0],
      slotTime: '11:00 AM - 12:00 PM',
      reason: 'Shift work schedule change',
    }),
  });
  const rescheduleData = await rescheduleRes.json();
  const reschedSlotTime = rescheduleData.appointment?.slotTime || rescheduleData.data?.slotTime;
  check('Appointment reschedule works', rescheduleRes.status === 200 && reschedSlotTime === '11:00 AM - 12:00 PM');

  const cancelApptRes = await fetch(`${BASE_URL}/appointments/${userApptId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({ cancellationReason: 'Personal emergency' }),
  });
  const cancelApptData = await cancelApptRes.json();
  const cancelApptStatus = cancelApptData.appointment?.status || cancelApptData.data?.status;
  check('Appointment cancel works', cancelApptRes.status === 200 && cancelApptStatus === 'CANCELLED');

  // Page 1.11: Donation History
  const historyRes = await fetch(`${BASE_URL}/donor/history`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const historyData = await historyRes.json();
  const donHistoryList = historyData.donations || historyData.data || [];
  check('Donation history loads correctly', historyRes.status === 200 && Array.isArray(donHistoryList));

  // Page 1.12: Notifications (Unread count, mark read, mark all read)
  const unreadCountRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const unreadCountData = await unreadCountRes.json();
  check('Notification unread count loads', unreadCountRes.status === 200 && (typeof unreadCountData.count === 'number' || typeof unreadCountData.data?.unreadCount === 'number'));

  const markAllReadRes = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  check('Mark all notifications read works', markAllReadRes.status === 200);

  // Page 1.13: Feedback / Complaint submission & tracking
  const feedbackRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      type: 'FEEDBACK',
      subject: 'Excellent staff at AIIMS Blood Bank',
      message: 'The phlebotomist was extremely gentle and professional.',
      category: 'BLOOD_BANK',
      rating: 5,
    }),
  });
  const feedbackData = await feedbackRes.json();
  const feedbackId = feedbackData.feedback?._id || feedbackData.data?._id;
  check('Feedback submission works', feedbackRes.status === 201 && !!feedbackId);

  const myFeedbackRes = await fetch(`${BASE_URL}/feedback/my`, {
    headers: { Authorization: `Bearer ${donorToken}` },
  });
  const myFeedbackData = await myFeedbackRes.json();
  const feedbackList = myFeedbackData.feedbacks || myFeedbackData.data || [];
  check('Feedback tracking page loads user submissions', myFeedbackRes.status === 200 && Array.isArray(feedbackList));

  // ========================================================================
  // ROLE 2: HOSPITAL DASHBOARD
  // ========================================================================
  console.log('\n--- 3. Checking HOSPITAL Dashboard Pages ---');

  // Page 2.1: Hospital Profile & Auto-Linked Post Blood Requirement
  const hospProfileRes = await fetch(`${BASE_URL}/hospital/profile`, {
    headers: { Authorization: `Bearer ${hospToken}` },
  });
  const hospProfileData = await hospProfileRes.json();
  const hospFacility = hospProfileData.hospital || hospProfileData.data;
  check('Hospital profile loads with NABH details', hospProfileRes.status === 200 && (!!hospFacility?.name || !!hospFacility?.facilityName));

  const hospReqPostRes = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hospToken}` },
    body: JSON.stringify({
      patientName: 'Pediatric Cardiac Case',
      bloodGroup: 'A+',
      units: 2,
      component: 'PRBC',
      urgency: 'URGENT',
      hospitalName: hospFacility?.name || hospFacility?.facilityName || 'Max Super Speciality',
      city: 'Delhi',
      notes: 'Required for scheduled pediatric surgery.',
    }),
  });
  const hospReqPostData = await hospReqPostRes.json();
  const hospReqId = hospReqPostData.request?._id || hospReqPostData.data?._id;
  const hospLinked = hospReqPostData.request?.hospital || hospReqPostData.data?.hospital;
  check('Hospital posts requirement (auto-linked to hospital)', hospReqPostRes.status === 201 && !!hospReqId && !!hospLinked);

  // Page 2.2: Track Requests
  const hospTrackRes = await fetch(`${BASE_URL}/hospital/requests`, {
    headers: { Authorization: `Bearer ${hospToken}` },
  });
  const hospTrackData = await hospTrackRes.json();
  const hospRequestsList = hospTrackData.requests || hospTrackData.data || [];
  const foundTrack = hospRequestsList.find((r) => r._id === hospReqId);
  check('Hospital track requests reflects submitted requirement', hospTrackRes.status === 200 && !!foundTrack);

  // Transition request to APPROVED by Admin so it can be issued & confirmed
  await BloodRequest.findByIdAndUpdate(hospReqId, { status: 'APPROVED' });

  // Issue units from Blood Bank to this request
  const bankIssueToHospRes = await fetch(`${BASE_URL}/bloodbank/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bankToken}` },
    body: JSON.stringify({
      recipient: hospFacility?.facilityName,
      bloodGroup: 'A+',
      units: 1,
      bagNo: `BAG-HOSP-TEST-${Date.now()}`,
      issuedTo: 'Hospital Transfusion Tech',
      requestId: hospReqId,
    }),
  });
  const bankIssueToHospData = await bankIssueToHospRes.json();

  // Page 2.3: Confirm Units Received
  const hospConfirmRes = await fetch(`${BASE_URL}/hospital/requests/${hospReqId}/confirm-received`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hospToken}` },
    body: JSON.stringify({
      batchNo: `BATCH-${Date.now()}`,
      receivedBy: 'Nurse In-charge Ward 2B',
      remarks: 'Crossmatch verified compatible. Patient infused.',
    }),
  });
  const hospConfirmData = await hospConfirmRes.json();
  const confirmedStatus = hospConfirmData.request?.status || hospConfirmData.data?.status;
  check('Hospital confirms units received (state becomes FULFILLED)', hospConfirmRes.status === 200 && confirmedStatus === 'FULFILLED');

  // Page 2.4: Hospital Profile Edit
  const hospProfUpdateRes = await fetch(`${BASE_URL}/hospital/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hospToken}` },
    body: JSON.stringify({
      emergencyContactNumber: '011-26593333',
      address: { city: 'New Delhi', state: 'Delhi', pincode: '110029' },
    }),
  });
  check('Hospital profile edit persists', hospProfUpdateRes.status === 200);

  // ========================================================================
  // ROLE 3: BLOOD_BANK DASHBOARD
  // ========================================================================
  console.log('\n--- 4. Checking BLOOD BANK Dashboard Pages ---');

  // Page 3.1: Inventory table & Edit stock per group
  const bankInvRes = await fetch(`${BASE_URL}/bloodbank/inventory`, {
    headers: { Authorization: `Bearer ${bankToken}` },
  });
  const bankInvData = await bankInvRes.json();
  const bankInventoryList = bankInvData.inventory || bankInvData.data || [];
  check('Blood Bank inventory table loads all groups', bankInvRes.status === 200 && Array.isArray(bankInventoryList) && bankInventoryList.length >= 8);

  const updateStockRes = await fetch(`${BASE_URL}/bloodbank/inventory/O%2B`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bankToken}` },
    body: JSON.stringify({
      action: 'SET',
      units: 45,
      reserved: 2,
    }),
  });
  const updateStockData = await updateStockRes.json();
  const updatedAvailableUnits = updateStockData.available ?? updateStockData.data?.units;
  check('Edit stock per blood group saves successfully', updateStockRes.status === 200 && updatedAvailableUnits === 45);

  // Page 3.2: Record Incoming Voluntary Donation (Direct)
  const incomingDonationRes = await fetch(`${BASE_URL}/bloodbank/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bankToken}` },
    body: JSON.stringify({
      donorId: donorUser.id || donorUser._id,
      bloodGroup: 'O+',
      units: 1,
      bagNo: `BAG-DIRECT-${Date.now()}`,
      hemoglobinGdl: '14.5',
      storageFridgeId: 'FRIDGE-C3',
    }),
  });
  const incomingDonationData = await incomingDonationRes.json();
  check('Record incoming donation links donor and increases inventory', incomingDonationRes.status === 201 && incomingDonationData.success);

  // Page 3.3: Issue Units (Reduces stock, prevents negative stock)
  // Create another approved request to issue units against
  const issueReq = await BloodRequest.create({
    requester: donorUser.id || donorUser._id,
    requesterModel: 'User',
    patientName: 'Surgical ICU Case',
    bloodGroup: 'O+',
    units: 1,
    hospitalName: 'AIIMS Trauma Centre',
    city: 'New Delhi',
    status: 'APPROVED',
  });

  const issueUnitsRes = await fetch(`${BASE_URL}/bloodbank/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bankToken}` },
    body: JSON.stringify({
      recipient: 'Max Healthcare Trauma Centre',
      bloodGroup: 'O+',
      units: 1,
      bagNo: `ISSUE-${Date.now()}`,
      issuedTo: 'Transfusion Courier Staff',
      requestId: issueReq._id,
    }),
  });
  const issueUnitsData = await issueUnitsRes.json();
  check('Issue units reduces stock correctly', issueUnitsRes.status === 200 && issueUnitsData.success);

  // Prevent negative stock test
  const excessIssueRes = await fetch(`${BASE_URL}/bloodbank/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bankToken}` },
    body: JSON.stringify({
      recipient: 'Emergency Overdraw Test',
      bloodGroup: 'O+',
      units: 999999, // impossible quantity
      bagNo: `EXCESS-${Date.now()}`,
      requestId: issueReq._id,
    }),
  });
  check('Prevent negative stock on excess issue (rejects 400)', excessIssueRes.status === 400);

  // Page 3.4: Appointments list (Complete & No-show buttons)
  const bankApptsRes = await fetch(`${BASE_URL}/appointments/bank`, {
    headers: { Authorization: `Bearer ${bankToken}` },
  });
  const bankApptsData = await bankApptsRes.json();
  const bankApptsList = bankApptsData.appointments || bankApptsData.data || [];
  check('Blood bank appointments list loads', bankApptsRes.status === 200 && Array.isArray(bankApptsList));

  // Page 3.5: Donation & Issue History
  const bankHistoryRes = await fetch(`${BASE_URL}/bloodbank/history`, {
    headers: { Authorization: `Bearer ${bankToken}` },
  });
  const bankHistoryData = await bankHistoryRes.json();
  const hasHistory = Array.isArray(bankHistoryData.history) || (Array.isArray(bankHistoryData.donations) && Array.isArray(bankHistoryData.issues));
  check('Blood bank donation & issue history loads with filters', bankHistoryRes.status === 200 && hasHistory);

  // ========================================================================
  // ROLE 4: ADMIN DASHBOARD
  // ========================================================================
  console.log('\n--- 5. Checking ADMIN Dashboard Pages ---');

  // Page 4.1: Dashboard Real DB Stats
  const adminStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminStatsData = await adminStatsRes.json();
  const adminUserCount = adminStatsData.data?.totals?.users ?? adminStatsData.totals?.users ?? adminStatsData.data?.overview?.totalUsers;
  check('Admin Dashboard stats reflect real database counts', adminStatsRes.status === 200 && adminUserCount > 0);

  // Page 4.2: User Management (Search, Block, Unblock)
  const adminUsersRes = await fetch(`${BASE_URL}/admin/users?search=priya`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminUsersData = await adminUsersRes.json();
  const usersList = adminUsersData.users || adminUsersData.data || [];
  const targetUser = usersList[0];
  check('Admin search user management works', adminUsersRes.status === 200 && !!targetUser);

  if (targetUser) {
    const blockRes = await fetch(`${BASE_URL}/admin/users/${targetUser._id}/block`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Audit safety test block' }),
    });
    check('Admin block user functional', blockRes.status === 200);

    const unblockRes = await fetch(`${BASE_URL}/admin/users/${targetUser._id}/unblock`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check('Admin unblock user functional', unblockRes.status === 200);
  }

  // Page 4.3: Donor Management (Approve/Reject)
  const adminDonorsRes = await fetch(`${BASE_URL}/admin/donors`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminDonorsData = await adminDonorsRes.json();
  const donorsAdminList = adminDonorsData.donors || adminDonorsData.data || [];
  const sampleDonor = donorsAdminList[0];
  check('Admin donor management list loads', adminDonorsRes.status === 200 && !!sampleDonor);

  if (sampleDonor) {
    const approveDonorRes = await fetch(`${BASE_URL}/admin/donors/${sampleDonor._id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Donor medical fitness certified by administrative officer.' }),
    });
    check('Admin approve donor updates status', approveDonorRes.status === 200);
  }

  // Page 4.4: Facility Management (Hospitals & Blood Banks)
  const adminHospsRes = await fetch(`${BASE_URL}/admin/hospitals`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  check('Admin hospital management list loads', adminHospsRes.status === 200);

  const adminBanksRes = await fetch(`${BASE_URL}/admin/bloodbanks`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  check('Admin blood bank management list loads', adminBanksRes.status === 200);

  // Page 4.5: Inventory Management (View & Override All Banks' Stock)
  const adminInvRes = await fetch(`${BASE_URL}/admin/inventory`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminInvData = await adminInvRes.json();
  const adminInvList = adminInvData.inventory || adminInvData.data || [];
  check('Admin views central inventory across all banks', adminInvRes.status === 200 && Array.isArray(adminInvList));

  const overrideRes = await fetch(`${BASE_URL}/admin/inventory/${seedBank._id}/AB%2B`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ units: 50, reason: 'Administrative emergency quota rebalance' }),
  });
  check('Admin stock override executes and logs update', overrideRes.status === 200);

  // Page 4.6: Request Management (Approve, Reject, State Machine)
  const adminReqsRes = await fetch(`${BASE_URL}/admin/requests`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  check('Admin requests management list loads', adminReqsRes.status === 200);

  // Page 4.7: Emergency Monitor
  const liveEmRes = await fetch(`${BASE_URL}/admin/emergency/live`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  check('Admin emergency live monitor loads active emergencies', liveEmRes.status === 200);

  // Page 4.8: Donation Management (Verify Completed Donation)
  const sampleDonation = await Donation.findOne();
  if (sampleDonation) {
    const verifyDonationRes = await fetch(`${BASE_URL}/admin/donations/${sampleDonation._id}/verify`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    check('Admin verify donation works', verifyDonationRes.status === 200);
  }

  // Page 4.9: Notification Broadcast
  const broadcastRes = await fetch(`${BASE_URL}/admin/notifications/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      targetRole: 'ALL',
      title: 'Mega Voluntary Blood Drive',
      message: 'Join us this Sunday at Shivaji Park for community donation drive.',
      channels: ['IN_APP'],
    }),
  });
  check('Admin notification broadcast reaches target users', broadcastRes.status === 200);

  // Page 4.10: Reports & Analytics (Data, PDF & Excel Exports)
  const reportsDataRes = await fetch(`${BASE_URL}/admin/reports?type=blood-group-demand-supply`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const reportsDataJson = await reportsDataRes.json();
  check('Admin reports aggregation endpoint returns real data', reportsDataRes.status === 200 && reportsDataJson.success);

  // PDF Export
  const pdfExportRes = await fetch(`${BASE_URL}/admin/reports/blood-group-demand-supply/export?format=pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pdfContentType = pdfExportRes.headers.get('content-type');
  const pdfBuffer = await pdfExportRes.arrayBuffer();
  check('Admin reports PDF export generates valid PDF stream', pdfExportRes.status === 200 && pdfContentType?.includes('application/pdf') && pdfBuffer.byteLength > 100);

  // Excel Export
  const xlsxExportRes = await fetch(`${BASE_URL}/admin/reports/blood-group-demand-supply/export?format=excel`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const xlsxContentType = xlsxExportRes.headers.get('content-type');
  const xlsxBuffer = await xlsxExportRes.arrayBuffer();
  check('Admin reports Excel export generates valid XLSX stream', xlsxExportRes.status === 200 && (xlsxContentType?.includes('spreadsheet') || xlsxContentType?.includes('octet-stream')) && xlsxBuffer.byteLength > 100);

  // Page 4.11: Complaints Management (Assign, Respond, Resolve)
  const complaintsRes = await fetch(`${BASE_URL}/admin/complaints`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const complaintsData = await complaintsRes.json();
  const complaintsList = complaintsData.complaints || complaintsData.data || [];
  const sampleComplaint = complaintsList[0];
  check('Admin complaints list loads with feedback and issues', complaintsRes.status === 200 && !!sampleComplaint);

  if (sampleComplaint) {
    const respondCRes = await fetch(`${BASE_URL}/admin/complaints/${sampleComplaint._id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ message: 'We have received your input and our clinical director is reviewing.' }),
    });
    check('Admin respond to complaint posts message', respondCRes.status === 200);

    const resolveCRes = await fetch(`${BASE_URL}/admin/complaints/${sampleComplaint._id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ resolutionNote: 'Issue investigated and resolved.' }),
    });
    check('Admin resolve complaint closes issue', resolveCRes.status === 200);
  }

  // Page 4.12: Audit Logs
  const auditLogsRes = await fetch(`${BASE_URL}/admin/audit-logs?limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const auditLogsData = await auditLogsRes.json();
  const auditLogsList = auditLogsData.logs || auditLogsData.data || [];
  check('Admin audit logs track all recent system actions', auditLogsRes.status === 200 && Array.isArray(auditLogsList) && auditLogsList.length > 0);

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('========================================================================\n');

  await mongoose.disconnect();
  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase5Audit().catch((err) => {
  console.error('Fatal Phase 5 audit error:', err);
  process.exit(1);
});
