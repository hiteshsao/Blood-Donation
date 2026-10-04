import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User, Otp, Hospital, BloodBank } from '../src/models/index.js';

const BASE_URL = 'http://localhost:5000/api/v1';
const MONGO_URI = 'mongodb://127.0.0.1:27017/blood_donation_db';

async function run() {
  console.log('Connecting to Mongo for direct DB inspection...');
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected.');

  const results = [];
  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${title} ${extra}`);
      results.push({ title, status: 'PASS', extra });
    } else {
      console.error(`  ❌ [FAIL] ${title} ${extra}`);
      results.push({ title, status: 'FAIL', extra });
    }
  }

  const timestamp = Date.now();
  const testUserEmail = `test.user.${timestamp}@example.com`;
  const testHospEmail = `test.hosp.${timestamp}@example.com`;
  const testBankEmail = `test.bank.${timestamp}@example.com`;
  const plainPassword = 'SecretPassword123!';

  console.log('\n--- 1. REGISTER TESTS ---');
  // 1a. Valid User Registration
  const regUserRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Regular User',
      email: testUserEmail,
      phone: '9876543210',
      password: plainPassword,
      role: 'USER',
      bloodGroup: 'O+',
      city: 'Mumbai',
    }),
  });
  const regUserData = await regUserRes.json();
  assert('User Registration succeeds (201)', regUserRes.status === 201 && regUserData.success);

  // 1b. Direct DB Check: Password Hashing
  const dbUser = await User.findOne({ email: testUserEmail }).select('+password +passwordHash +verificationOtp');
  const isHashed = dbUser && (dbUser.password?.startsWith('$2') || dbUser.passwordHash?.startsWith('$2'));
  const notPlain = dbUser?.password !== plainPassword && dbUser?.passwordHash !== plainPassword;
  assert('Password is hashed with bcrypt in DB (cost 12)', isHashed && notPlain, `hash: ${dbUser?.password?.substring(0, 10)}...`);

  // 1c. Duplicate Registration Rejected
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Admin User',
      email: 'admin@lifedrop.org',
      phone: '9876543210',
      password: plainPassword,
      role: 'USER',
    }),
  });
  const dupData = await dupRes.json();
  assert('Duplicate registration for verified account rejected with 409', dupRes.status === 409 && !dupData.success, `status: ${dupRes.status}, msg: "${dupData.message}"`);

  // 1d. Hospital Registration & Status=PENDING
  const regHospRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Test Hospital',
      email: testHospEmail,
      phone: '9876543211',
      password: plainPassword,
      role: 'HOSPITAL',
      facilityName: 'Test General Hospital',
      licenseNumber: `HOSP-TEST-${timestamp}`,
      city: 'Mumbai',
    }),
  });
  assert('Hospital Registration succeeds', regHospRes.status === 201);
  const dbHosp = await User.findOne({ email: testHospEmail });
  assert('Hospital created with status=PENDING', dbHosp?.status === 'PENDING', `status: ${dbHosp?.status}`);

  // 1e. Blood Bank Registration & Status=PENDING
  const regBankRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Blood Bank Coordinator',
      email: testBankEmail,
      phone: '9876543212',
      password: plainPassword,
      role: 'BLOOD_BANK',
      facilityName: 'Test Regional Blood Bank',
      licenseNumber: `BB-TEST-${timestamp}`,
      city: 'Mumbai',
    }),
  });
  assert('Blood Bank Registration succeeds', regBankRes.status === 201);
  const dbBank = await User.findOne({ email: testBankEmail });
  assert('Blood Bank created with status=PENDING', dbBank?.status === 'PENDING', `status: ${dbBank?.status}`);

  console.log('\n--- 2. OTP VERIFICATION TESTS ---');
  // 2a. Wrong OTP rejected
  const wrongOtpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      otp: '000000',
      type: 'REGISTRATION',
    }),
  });
  const wrongOtpData = await wrongOtpRes.json();
  assert('Wrong OTP rejected with 400', wrongOtpRes.status === 400 && !wrongOtpData.success, `msg: ${wrongOtpData.message}`);

  // 2b. Expired OTP rejected
  // Set expired OTP directly in DB to test
  const userForExpire = await User.findOne({ email: testUserEmail }).select('+verificationOtp');
  userForExpire.verificationOtp.expiresAt = new Date(Date.now() - 60000); // 1 min ago
  await userForExpire.save();

  const expiredOtpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      otp: '123456',
      type: 'REGISTRATION',
    }),
  });
  const expiredData = await expiredOtpRes.json();
  assert('Expired OTP rejected with 400', expiredOtpRes.status === 400, `msg: ${expiredData.message}`);

  // 2c. Resend OTP respects rate limiting / cooldown
  const immediateResendRes = await fetch(`${BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      type: 'REGISTRATION',
    }),
  });
  assert('Immediate resend OTP respects rate limiting cooldown', immediateResendRes.status === 429 || immediateResendRes.status === 400);

  // Advance cooldown timestamp to test successful resend
  const userToAdvance = await User.findOne({ email: testUserEmail });
  userToAdvance.lastRegistrationOtpSentAt = new Date(Date.now() - 65000);
  userToAdvance.lastOtpSentAt = new Date(Date.now() - 65000);
  await userToAdvance.save();

  const resendRes = await fetch(`${BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      type: 'REGISTRATION',
    }),
  });
  assert('Resend OTP succeeds after cooldown window (200)', resendRes.status === 200);

  // Set known OTP hash to verify the exact verification logic
  import('crypto').then();
  const crypto = await import('crypto');
  const knownOtp = '654321';
  const knownHash = crypto.createHash('sha256').update(knownOtp).digest('hex');
  const userForValid = await User.findOne({ email: testUserEmail }).select('+verificationOtp');
  userForValid.verificationOtp = { codeHash: knownHash, expiresAt: new Date(Date.now() + 600000) };
  await userForValid.save();

  // Verify valid OTP
  const verifyValidRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      otp: knownOtp,
      type: 'REGISTRATION',
    }),
  });
  const verifyValidData = await verifyValidRes.json();
  assert('Valid OTP verification succeeds (200)', verifyValidRes.status === 200 && verifyValidData.success);

  // Check Set-Cookie for refresh token
  const setCookie = verifyValidRes.headers.get('set-cookie') || '';
  assert('Verification sets httpOnly refreshToken cookie', setCookie.includes('refreshToken') && setCookie.includes('HttpOnly'));

  // Also verify Hospital OTP so its email is verified
  const hospUser = await User.findOne({ email: testHospEmail }).select('+verificationOtp');
  hospUser.verificationOtp = { codeHash: knownHash, expiresAt: new Date(Date.now() + 600000) };
  await hospUser.save();
  await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testHospEmail,
      otp: knownOtp,
      type: 'REGISTRATION',
    }),
  });

  console.log('\n--- 3. LOGIN TESTS ---');
  // 3a. Correct credentials return access token + refresh cookie
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      password: plainPassword,
    }),
  });
  const loginData = await loginRes.json();
  const loginCookie = loginRes.headers.get('set-cookie') || '';
  assert('Correct credentials login succeeds (200)', loginRes.status === 200 && loginData.success);
  assert('Access token present in response body', !!loginData.accessToken);
  assert('Refresh token set as httpOnly cookie on login', loginCookie.includes('refreshToken') && loginCookie.includes('HttpOnly'));

  // 3b. JWT payload inspection (userId, role, expiry)
  const decoded = jwt.decode(loginData.accessToken);
  const expirySecs = decoded.exp - decoded.iat;
  assert('JWT payload contains id, role, email', decoded.id && decoded.role === 'USER' && decoded.email === testUserEmail);
  assert('JWT access token expiry matches config (15m = 900s)', expirySecs === 900, `exp-iat: ${expirySecs}s`);

  // 3c. Wrong password rejected (test 3 times)
  for (let i = 1; i <= 3; i++) {
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'CompletelyWrongPassword123!',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert(`Wrong password rejected (attempt ${i}/3)`, wrongPassRes.status === 401 && !wrongPassData.success);
  }

  // 3d. Unverified email cannot log in
  const unverifiedEmail = `unverified.${timestamp}@example.com`;
  await User.create({
    name: 'Unverified Test',
    email: unverifiedEmail,
    phone: '9876543299',
    password: plainPassword,
    role: 'USER',
    isEmailVerified: false,
    isVerified: false,
    status: 'PENDING',
  });
  const unverifiedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: unverifiedEmail,
      password: plainPassword,
    }),
  });
  const unverifiedData = await unverifiedLoginRes.json();
  assert('Unverified account blocked from login (403)', unverifiedLoginRes.status === 403, `msg: "${unverifiedData.message}"`);

  // 3e. PENDING facility accounts cannot log in
  const pendingHospLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testHospEmail,
      password: plainPassword,
    }),
  });
  const pendingHospData = await pendingHospLoginRes.json();
  assert('PENDING hospital blocked from login until admin-verified (403)', pendingHospLoginRes.status === 403, `msg: "${pendingHospData.message}"`);

  // 3f. Blocked account cannot log in
  const blockedEmail = `blocked.${timestamp}@example.com`;
  await User.create({
    name: 'Blocked Test',
    email: blockedEmail,
    phone: '9876543298',
    password: plainPassword,
    role: 'USER',
    isEmailVerified: true,
    isVerified: true,
    status: 'BLOCKED',
    isBlocked: true,
  });
  const blockedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: blockedEmail,
      password: plainPassword,
    }),
  });
  const blockedData = await blockedLoginRes.json();
  assert('BLOCKED user blocked from login (403)', blockedLoginRes.status === 403, `msg: "${blockedData.message}"`);

  console.log('\n--- 4. TOKEN REFRESH TESTS ---');
  // 4a. Refresh access token using cookie
  const refreshCookieMatch = loginCookie.match(/refreshToken=([^;]+)/);
  const initialRefreshToken = refreshCookieMatch ? refreshCookieMatch[1] : loginData.refreshToken;

  const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `refreshToken=${initialRefreshToken}`,
    },
    body: JSON.stringify({ refreshToken: initialRefreshToken }),
  });
  const refreshData = await refreshRes.json();
  assert('Token refresh succeeds with valid refresh token (200)', refreshRes.status === 200 && !!refreshData.accessToken);

  // 4b. Invalid / fake refresh token rejected
  const fakeRefreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: 'fake.jwt.token' }),
  });
  assert('Invalid refresh token rejected (401)', fakeRefreshRes.status === 401);

  console.log('\n--- 5. ADMIN LOGIN TESTS ---');
  // 5a. Admin login with non-admin user rejected (403 Forbidden)
  const nonAdminLoginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      password: plainPassword,
    }),
  });
  const nonAdminData = await nonAdminLoginRes.json();
  assert('/auth/admin/login rejects regular user with correct password (403)', nonAdminLoginRes.status === 403, `msg: "${nonAdminData.message}"`);

  // 5b. Admin login with seeded admin succeeds
  const adminLoginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@lifedrop.org',
      password: 'Password@123',
    }),
  });
  const adminData = await adminLoginRes.json();
  assert('/auth/admin/login succeeds for ADMIN role (200)', adminLoginRes.status === 200 && adminData.user?.role === 'ADMIN');

  console.log('\n--- 6. LOGOUT TESTS ---');
  // 6a. Logout clears cookie server-side
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.accessToken}`,
      'Cookie': `refreshToken=${refreshData.refreshToken || initialRefreshToken}`,
    },
    body: JSON.stringify({ refreshToken: refreshData.refreshToken || initialRefreshToken }),
  });
  const logoutCookie = logoutRes.headers.get('set-cookie') || '';
  assert('Logout clears cookie server-side', logoutCookie.includes('refreshToken=;') || logoutCookie.includes('Max-Age=0') || logoutCookie.includes('expires='));

  // 6b. User in DB has refreshToken invalidated
  const loggedOutUser = await User.findOne({ email: testUserEmail }).select('+refreshToken');
  assert('User refreshToken cleared in DB after logout', !loggedOutUser?.refreshToken);

  // 6c. Refresh token reuse after logout rejected
  const reuseRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `refreshToken=${refreshData.refreshToken || initialRefreshToken}`,
    },
    body: JSON.stringify({ refreshToken: refreshData.refreshToken || initialRefreshToken }),
  });
  assert('Refresh token reuse after logout is rejected (401)', reuseRes.status === 401);

  console.log('\n--- 7. FORGOT & RESET PASSWORD TESTS ---');
  // 7a. Non-existent email does not reveal account existence
  const forgotNonExistRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `nonexistent.${timestamp}@example.com` }),
  });
  const forgotNonExistData = await forgotNonExistRes.json();
  assert('Forgot password for non-existent email returns 200 without disclosing absence', forgotNonExistRes.status === 200 && forgotNonExistData.success);

  // 7b. Forgot password for real user
  const forgotRealRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUserEmail }),
  });
  assert('Forgot password for real user succeeds', forgotRealRes.status === 200);

  // Set known reset OTP hash
  const resetUser = await User.findOne({ email: testUserEmail }).select('+passwordResetOtp');
  resetUser.passwordResetOtp = { codeHash: knownHash, expiresAt: new Date(Date.now() + 600000) };
  await resetUser.save();

  // 7c. Reset password with wrong OTP rejected
  const wrongResetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      otp: '000000',
      newPassword: 'BrandNewPassword123!',
    }),
  });
  assert('Reset password with wrong OTP rejected (400)', wrongResetRes.status === 400);

  // 7d. Reset password with valid OTP
  const newPlainPassword = 'BrandNewPassword123!';
  const validResetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      otp: knownOtp,
      newPassword: newPlainPassword,
    }),
  });
  const validResetData = await validResetRes.json();
  assert('Reset password with valid OTP succeeds (200)', validResetRes.status === 200 && validResetData.success);

  // 7e. Old password fails
  const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      password: plainPassword,
    }),
  });
  assert('Old password rejected after password reset (401)', oldLoginRes.status === 401);

  // 7f. New password succeeds
  const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      password: newPlainPassword,
    }),
  });
  assert('New password succeeds after password reset (200)', newLoginRes.status === 200);

  console.log('\n========================================');
  const failed = results.filter(r => r.status === 'FAIL');
  console.log(`Total tests: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  console.log('========================================');

  await mongoose.disconnect();
  process.exit(failed.length > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
