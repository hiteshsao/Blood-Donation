import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Hashed OTP code is required'],
    },
    purpose: {
      type: String,
      enum: ['VERIFICATION', 'PASSWORD_RESET', 'LOGIN_2FA'],
      required: [true, 'OTP purpose is required'],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically removes document upon reaching expiresAt
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

OtpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export const Otp = mongoose.model('Otp', OtpSchema);
