import mongoose from 'mongoose';

const FeedbackResponseSchema = new mongoose.Schema(
  {
    responder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['USER', 'DONOR', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN'],
      default: 'USER',
    },
    message: {
      type: String,
      required: [true, 'Response message is required'],
      trim: true,
    },
    statusChange: {
      type: String,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const FeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['FEEDBACK', 'COMPLAINT'],
      default: 'FEEDBACK',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'GENERAL',
        'SERVICE',
        'DONATION_EXPERIENCE',
        'APP_ISSUE',
        'HOSPITAL',
        'BLOOD_BANK',
        'DELAY',
        'STAFF_BEHAVIOR',
        'OTHER',
      ],
      default: 'GENERAL',
      index: true,
    },
    subject: {
      type: String,
      alias: 'title',
      required: [true, 'Subject is required'],
      trim: true,
    },
    message: {
      type: String,
      alias: 'description',
      required: [true, 'Message is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'PENDING', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    responses: {
      type: [FeedbackResponseSchema],
      alias: 'replies',
      default: [],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
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

FeedbackSchema.index({ type: 1, status: 1, createdAt: -1 });
FeedbackSchema.index({ user: 1, createdAt: -1 });

export const Feedback = mongoose.model('Feedback', FeedbackSchema);
