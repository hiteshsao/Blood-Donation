import cron from 'node-cron';
import { resetEligibleDonorAvailability } from '../services/donor.service.js';

/**
 * Daily cron job that runs at 00:30 every day.
 *
 * 1. Finds donors whose `nextEligibleDate` has passed and `isAvailable` is false.
 * 2. Resets their `isAvailable` to true.
 * 3. Creates an IN_APP notification for each donor informing them they can donate again.
 *
 * This runs 30 minutes after midnight to avoid collision with the
 * inventory expiry cron job (which runs at 00:00).
 */
export const runDailyDonorEligibilityReset = async () => {
  console.log('[DonorCron] Executing daily donor eligibility reset...');

  try {
    const result = await resetEligibleDonorAvailability();
    console.log(
      `[DonorCron] Reset complete — ${result.resetCount} donor(s) marked available, ${result.notifiedIds.length} notified.`
    );
    return result;
  } catch (error) {
    console.error('[DonorCron] Eligibility reset error:', error.message);
  }
};

/**
 * Register the daily cron schedule.
 * Runs at 00:30 every day (30 0 * * *).
 */
export const initDonorCron = () => {
  cron.schedule('30 0 * * *', () => {
    runDailyDonorEligibilityReset();
  });
  console.log('[DonorCron] Daily donor eligibility reset schedule registered (30 0 * * *)');
};
