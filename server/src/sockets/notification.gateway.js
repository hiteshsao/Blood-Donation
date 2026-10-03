import { getIO } from '../config/socket.js';
import { Notification } from '../models/Notification.js';
import { sendEmail } from '../config/mailer.js';

/**
 * Sends a real-time notification to a specific user via Socket.io and persists to DB
 */
export const notifyUser = async (userId, notificationData, sendFallbackEmail = false, userEmail = null) => {
  try {
    const io = getIO();
    // Persist to database
    const notification = await Notification.create({
      recipient: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      emailSent: sendFallbackEmail,
    });

    // Emit live event to user's personal room
    io.to(`user:${userId}`).emit('notification', notification);

    // Optional email fallback
    if (sendFallbackEmail && userEmail) {
      sendEmail({
        to: userEmail,
        subject: `[Blood Donation Alert] ${notificationData.title}`,
        text: notificationData.message,
        html: `<p><strong>${notificationData.title}</strong></p><p>${notificationData.message}</p>`,
      }).catch((e) => console.warn(`Fallback email failed: ${e.message}`));
    }

    return notification;
  } catch (error) {
    console.warn(`[NotificationGateway] notifyUser warning: ${error.message}`);
  }
};

/**
 * Emits an emergency blood alert to matched donors and admins
 */
export const emitEmergencyAlert = async (emergencyRequest, eligibleDonors) => {
  try {
    const io = getIO();

    // Broadcast to admin dashboard
    io.to('admin').emit('new_emergency_request', emergencyRequest);

    // Broadcast to blood group room
    io.to(`group:${emergencyRequest.bloodGroup}`).emit('emergency_alert', emergencyRequest);

    // Send direct notifications to nearby matched donors
    for (const donor of eligibleDonors) {
      const donorUserId = donor.user?._id || donor.user;
      const donorEmail = donor.user?.email;

      io.to(`user:${donorUserId}`).emit('emergency_alert_direct', {
        emergencyId: emergencyRequest._id,
        bloodRequest: emergencyRequest.bloodRequest,
        bloodGroup: emergencyRequest.bloodGroup,
        unitsRequired: emergencyRequest.unitsRequired,
        hospitalName: emergencyRequest.hospitalName,
        distanceKm: donor.distanceKm,
      });

      // Email fallback for critical emergency
      if (donorEmail) {
        sendEmail({
          to: donorEmail,
          subject: `🚨 URGENT: Blood Needed (${emergencyRequest.bloodGroup}) near you!`,
          text: `Urgent requirement for ${emergencyRequest.unitsRequired} unit(s) of ${emergencyRequest.bloodGroup} at ${emergencyRequest.hospitalName}. Please open the Blood Donation app to accept.`,
          html: `<div style="border-left: 4px solid #e11d48; padding-left: 12px;"><h2>🚨 Urgent Blood Donation Call</h2><p>A critical patient requires <strong>${emergencyRequest.unitsRequired} unit(s)</strong> of <strong>${emergencyRequest.bloodGroup}</strong> blood at <strong>${emergencyRequest.hospitalName}</strong>.</p><p>You are approximately <strong>${donor.distanceKm || 'few'} km</strong> away. Please check the portal to respond.</p></div>`,
        }).catch((e) => console.warn(`Emergency email dispatch failed: ${e.message}`));
      }
    }
  } catch (error) {
    console.warn(`[NotificationGateway] emitEmergencyAlert warning: ${error.message}`);
  }
};

/**
 * Emits live status update for a blood request
 */
export const emitRequestStatusUpdate = (requestId, requestData) => {
  try {
    const io = getIO();
    io.to(`request:${requestId}`).emit('request_status_change', requestData);
    if (requestData.requester) {
      const requesterId = requestData.requester._id || requestData.requester;
      io.to(`user:${requesterId}`).emit('my_request_updated', requestData);
    }
  } catch (error) {
    console.warn(`[NotificationGateway] emitRequestStatusUpdate warning: ${error.message}`);
  }
};

/**
 * Emits donor acceptance/rejection to request room and requester
 */
export const emitDonorResponse = (requestId, responseData) => {
  try {
    const io = getIO();
    io.to(`request:${requestId}`).emit('donor_response', responseData);
  } catch (error) {
    console.warn(`[NotificationGateway] emitDonorResponse warning: ${error.message}`);
  }
};

/**
 * Emits low stock alert to admin room
 */
export const emitLowStockAlert = (alertData) => {
  try {
    const io = getIO();
    io.to('admin').emit('low_stock_alert', alertData);
  } catch (error) {
    console.warn(`[NotificationGateway] emitLowStockAlert warning: ${error.message}`);
  }
};
