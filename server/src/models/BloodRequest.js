import mongoose from 'mongoose';

const AssignedDonorSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'ACCEPTED', 'DONATED', 'DECLINED', 'OFFERED', 'REJECTED'],
    default: 'ASSIGNED',
  },
  distanceKm: {
    type: Number,
    default: 0,
  },
  respondedAt: {
    type: Date,
    default: null,
  },
});

const StatusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  note: {
    type: String,
    default: '',
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
});

const BloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
      index: true,
    },
    hospitalName: {
      type: String,
      default: '',
      trim: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    units: {
      type: Number,
      alias: 'unitsRequired',
      required: [true, 'Units is required'],
      min: [1, 'At least 1 unit must be requested'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    urgency: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'CRITICAL', 'NORMAL', 'EMERGENCY'],
      default: 'ROUTINE',
      alias: 'priority',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'APPROVED',
        'DONOR_ASSIGNED',
        'IN_PROGRESS',
        'FULFILLED',
        'REJECTED',
        'CANCELLED',
        'MATCHING',
        'DONOR_FOUND',
        'PROCESSING',
      ],
      default: 'PENDING',
      index: true,
    },
    assignedDonors: [AssignedDonorSchema],
    matchedDonors: [AssignedDonorSchema], // alias
    statusHistory: [StatusHistorySchema],
    contactNumber: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
BloodRequestSchema.index({ location: '2dsphere' });
BloodRequestSchema.index({ requester: 1, createdAt: -1 });
BloodRequestSchema.index({ bloodGroup: 1, city: 1, status: 1 });
BloodRequestSchema.index({ urgency: 1, status: 1 });

// Synchronize assignedDonors with matchedDonors before save
BloodRequestSchema.pre('save', function (next) {
  if (this.assignedDonors && this.assignedDonors.length > 0 && (!this.matchedDonors || this.matchedDonors.length === 0)) {
    this.matchedDonors = this.assignedDonors;
  } else if (this.matchedDonors && this.matchedDonors.length > 0 && (!this.assignedDonors || this.assignedDonors.length === 0)) {
    this.assignedDonors = this.matchedDonors;
  }
  next();
});

export const BloodRequest = mongoose.model('BloodRequest', BloodRequestSchema);
