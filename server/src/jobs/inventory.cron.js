import cron from 'node-cron';
import { BloodInventory, InventoryStockLog, BloodBank, User } from '../models/index.js';
import { getIO } from '../config/socket.js';
import { notify } from '../services/notification.service.js';

const WHOLE_BLOOD_SHELF_LIFE_DAYS = 35;

const emitLowStockNotice = (data) => {
  try {
    const io = getIO();
    if (io) io.emit('low-stock', data);
  } catch (e) {
    // Socket not active in offline test mode
  }
};

/**
 * Daily inventory audit job:
 * 1. Scans blood batches where expiryDate <= now (or collectedDate + 35 days <= now) and status == 'AVAILABLE'
 * 2. Moves units from available to expired
 * 3. Records an 'EXPIRE' row in InventoryStockLog
 * 4. Checks low-stock threshold and dispatches alerts via notify() to Blood Bank staff and Admin
 * 5. Emits Socket.io 'low-stock' event
 *
 * @returns {Promise<Object>} Execution summary
 */
export const runDailyExpiryCheck = async () => {
  console.log('[Cron Job] Executing daily shelf-life expiry audit (35-day whole blood criteria)...');
  const now = new Date();
  const summary = {
    totalExpiredUnits: 0,
    inventoriesUpdated: 0,
    lowStockAlertsSent: 0,
  };

  try {
    const inventories = await BloodInventory.find();

    // Cache admin users for low-stock alerts
    const adminUsers = await User.find({ role: 'ADMIN' }).select('_id name email').lean();

    for (const inv of inventories) {
      let expiredCount = 0;

      if (inv.batches && inv.batches.length > 0) {
        inv.batches.forEach((batch) => {
          if (batch.status === 'AVAILABLE') {
            const expiry = batch.expiryDate
              ? new Date(batch.expiryDate)
              : new Date(new Date(batch.collectedDate || now).getTime() + WHOLE_BLOOD_SHELF_LIFE_DAYS * 86400000);

            if (expiry <= now) {
              batch.status = 'EXPIRED';
              expiredCount++;
            }
          }
        });
      }

      if (expiredCount > 0) {
        const prevUnits = inv.available ?? inv.unitsAvailable ?? 0;
        const newAvailable = Math.max(0, prevUnits - expiredCount);
        const newExpired = (inv.expired ?? inv.unitsExpired ?? 0) + expiredCount;

        inv.available = newAvailable;
        inv.unitsAvailable = newAvailable;
        inv.expired = newExpired;
        inv.unitsExpired = newExpired;
        inv.lastUpdated = now;
        await inv.save();

        summary.totalExpiredUnits += expiredCount;
        summary.inventoriesUpdated++;

        await InventoryStockLog.create({
          inventoryId: inv._id,
          bloodBank: inv.bloodBank,
          bloodBankId: inv.bloodBank,
          bloodGroup: inv.bloodGroup,
          changeType: 'EXPIRE',
          units: expiredCount,
          unitsChanged: -expiredCount,
          previousAvailableUnits: prevUnits,
          newAvailableUnits: newAvailable,
          balanceAfter: newAvailable,
          reason: `Automated daily expiry check (35-day shelf life exceeded)`,
        });

        console.log(
          `[Cron Job] Expired ${expiredCount} unit(s) of ${inv.bloodGroup} in bank ${inv.bloodBank}`
        );
      }

      // Check low stock condition
      const currentAvailable = inv.available ?? inv.unitsAvailable ?? 0;
      const threshold = inv.lowStockThreshold || 5;

      if (currentAvailable <= threshold) {
        summary.lowStockAlertsSent++;

        emitLowStockNotice({
          bloodBankId: inv.bloodBank,
          bloodGroup: inv.bloodGroup,
          unitsAvailable: currentAvailable,
          threshold,
          timestamp: now.toISOString(),
          reason: 'Blood stock has dropped below critical threshold',
        });

        // Fetch blood bank to notify staff
        const bank = await BloodBank.findById(inv.bloodBank).select('name user email').lean();

        // 1. Notify Blood Bank staff
        if (bank && bank.user) {
          try {
            await notify({
              userId: bank.user,
              type: 'LOW_STOCK_ALERT',
              title: `⚠️ CRITICAL: Low Stock for Blood Group ${inv.bloodGroup}`,
              message: `Available stock for ${inv.bloodGroup} at ${bank.name || 'Blood Bank'} has dropped to ${currentAvailable} unit(s) (Critical threshold: ${threshold}). Please arrange donation drives or transfer units immediately.`,
              channels: ['IN_APP', 'EMAIL'],
              meta: {
                bloodBankId: inv.bloodBank,
                bloodBankName: bank.name,
                bloodGroup: inv.bloodGroup,
                availableUnits: currentAvailable,
                threshold,
              },
            });
          } catch (notifErr) {
            console.warn('[Cron Job] Failed to notify bank user:', notifErr.message);
          }
        }

        // 2. Notify Platform Admins
        for (const admin of adminUsers) {
          try {
            await notify({
              userId: admin._id,
              type: 'LOW_STOCK_ALERT',
              title: `⚠️ Admin Alert: Low Stock at ${bank?.name || 'Blood Bank'} (${inv.bloodGroup})`,
              message: `Blood group ${inv.bloodGroup} at ${bank?.name || 'Blood Bank'} is at ${currentAvailable} unit(s) (Threshold: ${threshold}). System-wide supply may be impacted.`,
              channels: ['IN_APP'],
              meta: {
                bloodBankId: inv.bloodBank,
                bloodBankName: bank?.name,
                bloodGroup: inv.bloodGroup,
                availableUnits: currentAvailable,
                threshold,
              },
            });
          } catch (admErr) {
            // Silently continue for offline admins in tests
          }
        }
      }
    }
  } catch (error) {
    console.error('[Cron Job] Expiry audit error:', error.message);
  }

  return summary;
};

/**
 * Initialize daily schedule (runs every midnight at 00:00)
 */
export const initInventoryCron = () => {
  cron.schedule('0 0 * * *', () => {
    runDailyExpiryCheck();
  });
  console.log('[Cron Job] Daily blood shelf-life expiry schedule registered (0 0 * * *)');
};
