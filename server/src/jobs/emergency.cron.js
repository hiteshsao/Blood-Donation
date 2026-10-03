import cron from 'node-cron';
import { runEmergencyEscalationCron } from '../services/emergency.service.js';

/**
 * Recurring cron job checking for emergencies that require escalation.
 * Runs every 5 minutes: checks if any active emergency has been open >= 15 minutes
 * with insufficient donor acceptances, and expands the search radius.
 */
export const runEmergencyEscalationJob = async () => {
  console.log('[EmergencyCron] Running emergency auto-escalation check...');
  try {
    const results = await runEmergencyEscalationCron();
    if (results && results.length > 0) {
      console.log(
        `[EmergencyCron] Successfully escalated ${results.length} active emergency request(s).`
      );
    }
    return results;
  } catch (error) {
    console.error('[EmergencyCron] Escalation job error:', error.message);
  }
};

/**
 * Register emergency escalation cron schedule (every 5 minutes).
 */
export const initEmergencyCron = () => {
  cron.schedule('*/5 * * * *', () => {
    runEmergencyEscalationJob();
  });
  console.log('[EmergencyCron] Emergency auto-escalation schedule registered (*/5 * * * *)');
};
