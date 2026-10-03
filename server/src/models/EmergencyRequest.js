import mongoose from 'mongoose';

const NotifiedDonorSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  response: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'NOTIFIED'],
    default: 'PENDING',
  },
  status: {
    type: String, // alias
    default: 'PENDING',
  },
  distanceKm: {
    type: Number,
    default: 0,
  },
  notifiedAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
    default: null,
  },
});

const EmergencyRequestSchema = new mongoose.Schema(
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
    },
    patientName: {
      type: String,
      default: 'Emergency Patient',
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
      required: true,
      min: [1, 'At least 1 unit must be requested'],
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    urgency: {
      type: String,
      default: 'CRITICAL',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    radiusKm: {
      type: Number,
      alias: 'searchRadiusKm',
      default: 15,
      min: 1,
    },
    initialRadiusKm: {
      type: Number,
      default: 15,
    },
    escalationLevel: {
      type: Number,
      default: 0,
    },
    lastEscalatedAt: {
      type: Date,
      default: null,
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
    notifiedDonors: [NotifiedDonorSchema],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 }, // TTL index
    },
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
EmergencyRequestSchema.index({ location: '2dsphere' });
EmergencyRequestSchema.index({ bloodGroup: 1, status: 1 });

export const EmergencyRequest = mongoose.model('EmergencyRequest', EmergencyRequestSchema);
