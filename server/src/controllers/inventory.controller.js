import { BloodInventory, InventoryStockLog, BloodBank } from '../models/index.js';
import { updateStockAtomic } from '../services/inventory.service.js';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Get inventory for a specific blood bank (guarantees one row per blood group)
 * GET /api/inventory/:bloodBankId
 */
export const getInventoryByBank = async (req, res, next) => {
  try {
    const { bloodBankId } = req.params;

    const bank = await BloodBank.findById(bloodBankId);
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: 'Blood bank not found',
      });
    }

    const records = await BloodInventory.find({ bloodBank: bloodBankId });

    // Map each blood group to ensure complete 8-group grid
    const inventoryMap = {};
    records.forEach((rec) => {
      inventoryMap[rec.bloodGroup] = rec;
    });

    const fullInventory = ALL_BLOOD_GROUPS.map((bg) => {
      if (inventoryMap[bg]) {
        const item = inventoryMap[bg];
        return {
          _id: item._id,
          bloodBank: bloodBankId,
          bloodGroup: bg,
          availableUnits: item.unitsAvailable,
          reservedUnits: item.unitsReserved,
          expiredUnits: item.unitsExpired,
          totalCollectedUnits: item.unitsTotalCollected,
          lowStockThreshold: item.lowStockThreshold || 5,
          isLowStock: item.unitsAvailable < (item.lowStockThreshold || 5),
          lastUpdated: item.lastUpdated || item.updatedAt,
        };
      } else {
        return {
          _id: null,
          bloodBank: bloodBankId,
          bloodGroup: bg,
          availableUnits: 0,
          reservedUnits: 0,
          expiredUnits: 0,
          totalCollectedUnits: 0,
          lowStockThreshold: 5,
          isLowStock: true,
          lastUpdated: new Date(),
        };
      }
    });

    res.status(200).json({
      success: true,
      bloodBank: {
        _id: bank._id,
        name: bank.name,
        city: bank.city,
        operatingHours: bank.operatingHours,
      },
      inventory: fullInventory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Atomic stock update route
 * POST /api/inventory/update
 */
export const updateStock = async (req, res, next) => {
  try {
    const { bloodBankId, bloodGroup, changeType, units, reason } = req.body;

    if (!bloodBankId || !bloodGroup || !changeType || units === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bloodBankId, bloodGroup, changeType, and units.',
      });
    }

    const result = await updateStockAtomic({
      bloodBankId,
      bloodGroup,
      changeType,
      units: Number(units),
      performedBy: req.user?._id || null,
      reason: reason || '',
    });

    res.status(200).json({
      success: true,
      message: `Successfully executed atomic stock update (${changeType} ${units} units).`,
      inventory: result.inventory,
      log: result.log,
      isLowStock: result.isLowStock,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View stock history logs
 * GET /api/inventory/logs/:bloodBankId
 */
export const getStockLogs = async (req, res, next) => {
  try {
    const { bloodBankId } = req.params;
    const { bloodGroup, limit = 50 } = req.query;

    const query = { bloodBankId };
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const logs = await InventoryStockLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get critical low stock alerts across all or specific bank
 * GET /api/inventory/low-stock-check
 */
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const { bloodBankId } = req.query;
    const filter = {};
    if (bloodBankId) filter.bloodBank = bloodBankId;

    const allInventory = await BloodInventory.find(filter).populate('bloodBank', 'name city phone');
    const lowStockItems = allInventory.filter(
      (item) => item.unitsAvailable < (item.lowStockThreshold || 5)
    );

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      alerts: lowStockItems.map((item) => ({
        inventoryId: item._id,
        bloodBank: item.bloodBank,
        bloodGroup: item.bloodGroup,
        unitsAvailable: item.unitsAvailable,
        threshold: item.lowStockThreshold || 5,
        deficit: (item.lowStockThreshold || 5) - item.unitsAvailable,
      })),
    });
  } catch (error) {
    next(error);
  }
};
