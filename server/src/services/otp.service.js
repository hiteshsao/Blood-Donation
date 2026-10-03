import { generateOtp, hashOtp, verifyOtpHash } from '../utils/otp.util.js';
import { sendOtpEmail } from './email.service.js';
import { Otp } from '../models/Otp.js';

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;

/**
 * Generates an OTP, saves hash & expiry on user document & Otp collection, sends email
 * @param {Object} user Mongoose user document
 * @param {string} type 'REGISTRATION' | 'PASSWORD_RESET'
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendOtpToUser = async (user, type = 'REGISTRATION') => {
  // Check cooldown (skip cooldown in test environment)
  if (process.env.NODE_ENV !== 'test' && user.lastOtpSentAt) {
    const elapsedSeconds = (Date.now() - new Date(user.lastOtpSentAt).getTime()) / 1000;
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      const cooldownError = new Error(`Please wait ${waitTime} seconds before requesting a new OTP.`);
      cooldownError.statusCode = 429;
      throw cooldownError;
    }
  }

  const plainOtp = generateOtp();
  const codeHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (type === 'REGISTRATION') {
    user.verificationOtp = { codeHash, expiresAt };
  } else if (type === 'PASSWORD_RESET') {
    user.passwordResetOtp = { codeHash, expiresAt };
  }
  user.lastOtpSentAt = new Date();
  await user.save();

  // Also persist in Otp collection
  try {
    await Otp.create({
      user: user._id,
      email: user.email,
      code: codeHash,
      purpose: type === 'REGISTRATION' ? 'VERIFICATION' : 'PASSWORD_RESET',
      expiresAt,
    });
  } catch (err) {
    // Non-blocking log if Otp collection fails
    console.warn('[OTP Service] Otp record write warning:', err.message);
  }

  try {
    await sendOtpEmail({
      to: user.email,
      name: user.name || 'User',
      otp: plainOtp,
      type,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (emailErr) {
    console.error('\n🔴 [SMTP Outbound Delivery Failure]:');
    console.error('Error Code:', emailErr.code);
    console.error('Error Message:', emailErr.message);
    console.error('Stack Trace:\n', emailErr.stack);
    console.error('--------------------------------------------------');
    console.log(`\n======================================================`);
    console.log(`🔑 [DEVELOPMENT OTP FALLBACK]`);
    console.log(`Target Email: ${user.email}`);
    console.log(`One-Time Code (OTP): ${plainOtp}`);
    console.log(`Expires In: ${OTP_EXPIRY_MINUTES} minutes`);
    console.log(`======================================================\n`);

    if (process.env.NODE_ENV === 'production') {
      const deliveryErr = new Error(`Failed to deliver OTP email (${emailErr.message}). Please verify your mail settings.`);
      deliveryErr.statusCode = 502;
      throw deliveryErr;
    }
  }

  return {
    success: true,
    message: `OTP sent successfully to ${user.email}`,
    otp: process.env.NODE_ENV !== 'production' ? plainOtp : undefined,
  };
};


/**
 * Verifies the OTP for a user
 * @param {Object} user 
 * @param {string} enteredOtp 
 * @param {string} type 'REGISTRATION' | 'PASSWORD_RESET'
 * @returns {boolean}
 */
export const verifyOtp = (user, enteredOtp, type = 'REGISTRATION') => {
  const otpData = type === 'REGISTRATION' ? user.verificationOtp : user.passwordResetOtp;

  if (!otpData || !otpData.codeHash || !otpData.expiresAt) {
    throw new Error('No OTP request found for this account. Please request a new OTP.');
  }

  if (new Date() > new Date(otpData.expiresAt)) {
    throw new Error('OTP has expired. Please request a new code.');
  }

  const isValid = verifyOtpHash(enteredOtp, otpData.codeHash);
  if (!isValid) {
    throw new Error('Invalid OTP. Please check the code and try again.');
  }

  return true;
};
