import nodemailer from 'nodemailer';
import { sendEmail as mailerSendEmail, getTransporter } from '../config/mailer.js';

/**
 * Service to handle email notifications via Nodemailer with console logger fallback in development
 */

export const sendEmail = async ({ to, subject, html, text }) => {
  return mailerSendEmail({ to, subject, html, text });
};

/**
 * Sends a 6-digit OTP email with 10-minute expiry
 * @param {Object} options
 * @param {string} options.to Recipient email
 * @param {string} [options.name] Recipient name
 * @param {string} options.otp 6-digit OTP code
 * @param {string} [options.type='REGISTRATION'] Purpose: REGISTRATION | PASSWORD_RESET
 * @param {number} [options.expiryMinutes=10]
 */
export const sendOtpEmail = async ({ to, name = 'User', otp, type = 'REGISTRATION', expiryMinutes = 10 }) => {
  const isReg = type === 'REGISTRATION';
  const subject = isReg 
    ? 'Verify Your Blood Donation Network Account' 
    : 'Reset Your Blood Donation Account Password';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAF8; margin: 0; padding: 24px; color: #1C1B1A; }
        .wrapper { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E4E1DC; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
        .brand { font-size: 20px; font-weight: 700; color: #A31621; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
        .title { font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #1C1B1A; }
        .text { font-size: 15px; line-height: 1.6; color: #6B6863; margin-bottom: 16px; }
        .otp-container { background: #FAFAF8; border: 2px dashed #A31621; border-radius: 6px; padding: 20px; text-align: center; margin: 28px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #A31621; font-family: 'SF Mono', Consolas, Monaco, monospace; }
        .expiry-note { font-size: 13px; color: #6B6863; margin-top: 8px; }
        .footer { font-size: 12px; color: #9E9B95; margin-top: 32px; border-top: 1px solid #E4E1DC; padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="brand">🩸 Blood Donation Emergency Network</div>
        <div class="title">${isReg ? 'Verify Your Account' : 'Password Reset Request'}</div>
        <p class="text">Hello <strong>${name}</strong>,</p>
        <p class="text">
          ${isReg 
            ? 'Thank you for registering with the Blood Donation Network. Please enter the following 6-digit One-Time Password (OTP) to activate your account:' 
            : 'We received a request to reset your password. Use the following 6-digit One-Time Password (OTP) to proceed:'}
        </p>
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
          <div class="expiry-note">This code expires in <strong>${expiryMinutes} minutes</strong>.</div>
        </div>
        <p class="text">If you did not request this verification, please safely ignore this email. Your account remains secure.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Blood Donation Network. Saving lives through real-time coordination.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hello ${name},\n\nYour Blood Donation Network OTP is: ${otp}\n\nIt is valid for ${expiryMinutes} minutes.\nIf you did not make this request, please ignore this email.`;

  return mailerSendEmail({ to, subject, html, text });
};

export default {
  sendEmail,
  sendOtpEmail,
  getTransporter,
};
