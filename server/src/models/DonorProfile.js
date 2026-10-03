import mongoose from 'mongoose';

const DonorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      alias: 'userId',
      required: true,
      unique: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
      index: true,
    },
    weight: {
      type: Number,
      alias: 'weightKg',
      min: [40, 'Weight must be at least 40 kg'],
      default: null,
    },
    dob: {
      type: Date,
      default: null,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    nextEligibleDate: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    medicalConditions: {
      type: [String],
      default: [],
    },
    medicalNotes: {
      type: String,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    totalDonations: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
DonorProfileSchema.index({ location: '2dsphere' });
DonorProfileSchema.index({ bloodGroup: 1, isAvailable: 1, nextEligibleDate: 1 });
DonorProfileSchema.index({ verificationStatus: 1, isAvailable: 1 });

// Synchronize verificationStatus with boolean isVerified
DonorProfileSchema.pre('save', function (next) {
  if (this.isModified('verificationStatus')) {
    this.isVerified = this.verificationStatus === 'VERIFIED';
  } else if (this.isModified('isVerified')) {
    this.verificationStatus = this.isVerified ? 'VERIFIED' : 'PENDING';
  }
  next();
});

export const DonorProfile = mongoose.model('DonorProfile', DonorProfileSchema);
