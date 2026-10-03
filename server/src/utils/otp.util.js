import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit OTP string
 */
export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hashes an OTP with SHA-256 for secure database storage
 * @param {string} otp 
 * @returns {string} hashed hex string
 */
export const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

/**
 * Verifies if entered OTP matches the stored hash
 * @param {string} enteredOtp 
 * @param {string} storedHash 
 * @returns {boolean}
 */
export const verifyOtpHash = (enteredOtp, storedHash) => {
  if (!enteredOtp || !storedHash) return false;
  const hash = hashOtp(enteredOtp);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
};
