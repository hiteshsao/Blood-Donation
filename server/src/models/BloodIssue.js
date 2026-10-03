import mongoose from 'mongoose';

const BloodIssueSchema = new mongoose.Schema(
  {
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank',
      required: [true, 'Blood Bank reference is required'],
      index: true,
    },
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: [true, 'Blood Request reference is required'],
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: [true, 'Blood group is required'],
      index: true,
    },
    units: {
      type: Number,
      required: [true, 'Units issued is required'],
      min: [1, 'At least 1 unit must be issued'],
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    issuedToPatient: {
      type: String,
      default: '',
      trim: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

BloodIssueSchema.index({ bloodBank: 1, issuedAt: -1 });
BloodIssueSchema.index({ request: 1, bloodGroup: 1 });

export const BloodIssue = mongoose.model('BloodIssue', BloodIssueSchema);
