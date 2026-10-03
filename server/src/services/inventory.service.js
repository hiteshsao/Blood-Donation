import mongoose from 'mongoose';
import { BloodInventory, InventoryStockLog, BloodBank } from '../models/index.js';
import { getIO } from '../config/socket.js';

const emitLowStockAlert = (data) => {
  try {
    const io = getIO();
    if (io) io.emit('low-stock', data);
  } catch (e) {
    // Socket not initialized in tests or offline scripts
  }
};

/**
 * Atomic stock update function for Blood Inventory
 * Safely updates inventory units and writes an immutable audit row in InventoryStockLog.
 * Uses MongoDB multi-document transactions when a replica set is active, and atomic document updates on standalone instances.
 * 
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.bloodBankId - Target blood bank ID
 * @param {string} params.bloodGroup - Blood group enum ('A+', 'A-', 'B+', etc.)
 * @param {'ADD'|'ISSUE'|'EXPIRE'|'ADJUST'} params.changeType - Nature of inventory change
 * @param {number} params.units - Number of units to add, issue, or adjust
 * @param {string|mongoose.Types.ObjectId} [params.performedBy] - User ID who triggered action
 * @param {string} [params.reason] - Clinical rationale or requisition note
 * @returns {Promise<{ inventory: Object, log: Object, isLowStock: boolean }>}
 */
export const updateStockAtomic = async ({
  bloodBankId,
  bloodGroup,
  changeType,
  units,
  performedBy = null,
  reason = '',
}) => {
  const numUnits = Number(units);
  if (isNaN(numUnits) || numUnits <= 0) {
    throw new Error('Stock units must be a positive number.');
  }

  // Core update execution logic
  const executeOperation = async (session = null) => {
    const sessionOpt = session ? { session } : {};

    let inventory = await BloodInventory.findOne(
      { bloodBank: bloodBankId, bloodGroup },
      null,
      sessionOpt
    );

    if (!inventory) {
      const created = await BloodInventory.create(
        [
          {
            bloodBank: bloodBankId,
            bloodGroup,
            unitsAvailable: 0,
            unitsReserved: 0,
            unitsExpired: 0,
            unitsTotalCollected: 0,
            lowStockThreshold: 5,
            lastUpdated: new Date(),
          },
        ],
        sessionOpt
      );
      inventory = created[0];
    }

    const previousAvailable = inventory.unitsAvailable;
    let newAvailable = previousAvailable;
    let newTotalCollected = inventory.unitsTotalCollected;
    let newExpired = inventory.unitsExpired;

    // State transition calculation
    switch (changeType) {
      case 'ADD':
        newAvailable = previousAvailable + numUnits;
        newTotalCollected = inventory.unitsTotalCollected + numUnits;
        inventory.unitsAvailable = newAvailable;
        inventory.unitsTotalCollected = newTotalCollected;
        break;

      case 'ISSUE':
        if (previousAvailable < numUnits) {
          throw new Error(
            `Insufficient stock. Available: ${previousAvailable} units of ${bloodGroup}, requested: ${numUnits} units.`
          );
        }
        newAvailable = previousAvailable - numUnits;
        inventory.unitsAvailable = newAvailable;
        break;

      case 'EXPIRE':
        if (previousAvailable < numUnits) {
          throw new Error(
            `Cannot mark more expired units than currently available (${previousAvailable} units).`
          );
        }
        newAvailable = previousAvailable - numUnits;
        newExpired = inventory.unitsExpired + numUnits;
        inventory.unitsAvailable = newAvailable;
        inventory.unitsExpired = newExpired;
        break;

      case 'ADJUST':
        newAvailable = numUnits;
        inventory.unitsAvailable = newAvailable;
        break;

      default:
        throw new Error(`Unsupported changeType: ${changeType}`);
    }

    inventory.lastUpdated = new Date();
    await inventory.save(sessionOpt);

    // Write immutable audit log row
    const logRows = await InventoryStockLog.create(
      [
        {
          inventoryId: inventory._id,
          bloodBankId,
          bloodGroup,
          changeType,
          units: numUnits,
          previousAvailableUnits: previousAvailable,
          newAvailableUnits: newAvailable,
          performedBy,
          reason,
        },
      ],
      sessionOpt
    );
    const stockLog = logRows[0];

    // Check low stock threshold
    const isLowStock = newAvailable < (inventory.lowStockThreshold || 5);
    if (isLowStock) {
      emitLowStockAlert({
        bloodBankId,
        bloodGroup,
        unitsAvailable: newAvailable,
        threshold: inventory.lowStockThreshold || 5,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      inventory,
      log: stockLog,
      isLowStock,
    };
  };

  // Attempt transaction with session; gracefully fall back if standalone instance without replica set
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await executeOperation(session);
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        // Ignore abort errors
      }
      session.endSession();
    }

    // If transactions are not permitted on standalone instance, execute directly
    if (
      err.message &&
      err.message.includes('Transaction numbers are only allowed on a replica set member or mongos')
    ) {
      return await executeOperation(null);
    }
    throw err;
  }
};
