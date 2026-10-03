import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },
    category: {
      type: String,
      enum: ['STAFF_BEHAVIOR', 'DELAY_IN_FULFILLMENT', 'INCORRECT_INFORMATION', 'HARASSMENT', 'TECHNICAL_GLITCH', 'OTHER'],
      default: 'OTHER',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'],
      default: 'OPEN',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    resolution: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ComplaintSchema.index({ status: 1, priority: 1, createdAt: -1 });

export const Complaint = mongoose.model('Complaint', ComplaintSchema);
