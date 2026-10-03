import mongoose from 'mongoose';

const InventoryStockLogSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodInventory',
      required: true,
      index: true,
    },
    bloodBankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank',
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    changeType: {
      type: String,
      enum: ['ADD', 'ISSUE', 'EXPIRE', 'ADJUST'],
      required: true,
      index: true,
    },
    units: {
      type: Number,
      required: true,
    },
    previousAvailableUnits: {
      type: Number,
      default: 0,
    },
    newAvailableUnits: {
      type: Number,
      default: 0,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

InventoryStockLogSchema.index({ bloodBankId: 1, createdAt: -1 });

export const InventoryStockLog = mongoose.model('InventoryStockLog', InventoryStockLogSchema);
