import mongoose from 'mongoose';

const EligibilityRuleSchema = new mongoose.Schema(
  {
    ruleName: {
      type: String,
      required: true,
      default: 'Standard National Blood Donation Eligibility Rule',
    },
    minAge: {
      type: Number,
      required: true,
      default: 18,
    },
    maxAge: {
      type: Number,
      required: true,
      default: 65,
    },
    minWeightKg: {
      type: Number,
      required: true,
      default: 50,
    },
    minMaleGapDays: {
      type: Number,
      required: true,
      default: 90, // 3 months
    },
    minFemaleGapDays: {
      type: Number,
      required: true,
      default: 120, // 4 months
    },
    minHemoglobin: {
      type: Number,
      required: true,
      default: 12.5, // g/dL
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const EligibilityRule = mongoose.model('EligibilityRule', EligibilityRuleSchema);
