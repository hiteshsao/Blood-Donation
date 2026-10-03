import cron from 'node-cron';
import { sendAppointmentReminders } from '../services/appointment.service.js';

/**
 * 24-Hour Appointment Reminder Job
 * 
 * Scans for all upcoming voluntary donation appointments occurring in the next 24 hours
 * where reminderSent !== true.
 * Dispatches an in-app and email reminder to the donor, then marks reminderSent = true.
 */
export const runAppointmentReminderJob = async () => {
  console.log('[AppointmentCron] Checking for appointments requiring 24h reminders...');

  try {
    const result = await sendAppointmentReminders();
    if (result.remindedCount > 0) {
      console.log(
        `[AppointmentCron] Dispatched 24h reminders for ${result.remindedCount} upcoming appointment(s).`
      );
    }
    return result;
  } catch (error) {
    console.error('[AppointmentCron] Error during reminder job execution:', error.message);
  }
};

/**
 * Initializes the appointment reminder cron schedule.
 * Runs every hour at minute 0 ('0 * * * *') to catch appointments entering the 24-hour window.
 */
export const initAppointmentCron = () => {
  cron.schedule('0 * * * *', () => {
    runAppointmentReminderJob();
  });
  console.log('[AppointmentCron] 24h appointment reminder schedule registered (0 * * * *)');
};
