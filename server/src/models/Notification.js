import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      alias: 'recipient',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'EMAIL', 'SMS'],
      default: 'IN_APP',
      index: true,
    },
    channels: {
      type: [String],
      enum: ['IN_APP', 'EMAIL', 'SMS'],
      default: ['IN_APP'],
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      alias: 'data',
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', NotificationSchema);
