import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      index: true,
    },
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank',
      default: null,
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    units: {
      type: Number,
      alias: 'unitsDonated',
      required: true,
      default: 1,
      min: [1, 'At least 1 unit must be donated'],
    },
    donatedAt: {
      type: Date,
      alias: 'donationDate',
      default: Date.now,
      index: true,
    },
    verifiedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'VERIFIED',
      index: true,
    },
    certificateId: {
      type: String,
      unique: true,
      sparse: true,
    },
    certificateUrl: {
      type: String,
      default: null,
    },
    remarks: {
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

DonationSchema.index({ donor: 1, donatedAt: -1 });
DonationSchema.index({ bloodBank: 1, donatedAt: -1 });

export const Donation = mongoose.model('Donation', DonationSchema);
