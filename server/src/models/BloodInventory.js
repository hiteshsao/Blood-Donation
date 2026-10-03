import mongoose from 'mongoose';

const BatchUnitSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
  },
  collectedDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'RESERVED', 'ISSUED', 'EXPIRED'],
    default: 'AVAILABLE',
  },
});

const InventorySchema = new mongoose.Schema(
  {
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank',
      alias: 'bloodBankId',
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    available: {
      type: Number,
      default: 0,
      min: [0, 'Available units cannot be negative'],
    },
    unitsAvailable: {
      type: Number,
      default: 0,
      min: [0, 'Available units cannot be negative'],
    },
    reserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved units cannot be negative'],
    },
    unitsReserved: {
      type: Number,
      default: 0,
      min: [0, 'Reserved units cannot be negative'],
    },
    expired: {
      type: Number,
      default: 0,
      min: [0, 'Expired units cannot be negative'],
    },
    unitsExpired: {
      type: Number,
      default: 0,
      min: [0, 'Expired units cannot be negative'],
    },
    unitsTotalCollected: {
      type: Number,
      default: 0,
      min: [0, 'Total collected units cannot be negative'],
    },
    totalCollectedUnits: {
      type: Number,
      default: 0,
      min: [0, 'Total collected units cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [1, 'Low-stock threshold must be at least 1'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    batches: [BatchUnitSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index ensuring one document per blood group per blood bank
InventorySchema.index({ bloodBank: 1, bloodGroup: 1 }, { unique: true });
InventorySchema.index({ bloodBank: 1, available: 1 });
InventorySchema.index({ bloodGroup: 1, available: 1 });

// Synchronize unitsAvailable with available, etc.
InventorySchema.pre('save', function (next) {
  if (this.isModified('unitsAvailable')) {
    this.available = this.unitsAvailable;
  } else if (this.isModified('available')) {
    this.unitsAvailable = this.available;
  } else {
    this.available = this.available ?? this.unitsAvailable ?? 0;
    this.unitsAvailable = this.available;
  }

  if (this.isModified('unitsReserved')) {
    this.reserved = this.unitsReserved;
  } else if (this.isModified('reserved')) {
    this.unitsReserved = this.reserved;
  } else {
    this.reserved = this.reserved ?? this.unitsReserved ?? 0;
    this.unitsReserved = this.reserved;
  }

  if (this.isModified('unitsExpired')) {
    this.expired = this.unitsExpired;
  } else if (this.isModified('expired')) {
    this.unitsExpired = this.expired;
  } else {
    this.expired = this.expired ?? this.unitsExpired ?? 0;
    this.unitsExpired = this.expired;
  }

  if (this.isModified('unitsTotalCollected')) {
    this.totalCollectedUnits = this.unitsTotalCollected;
  } else if (this.isModified('totalCollectedUnits')) {
    this.unitsTotalCollected = this.totalCollectedUnits;
  } else {
    this.unitsTotalCollected = this.unitsTotalCollected ?? this.totalCollectedUnits ?? 0;
    this.totalCollectedUnits = this.unitsTotalCollected;
  }

  next();
});

export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
export const BloodInventory = Inventory;
