import { EligibilityRule } from '../models/EligibilityRule.js';

/**
 * Retrieves the active eligibility rule or defaults
 */
export const getActiveEligibilityRule = async () => {
  let rule = await EligibilityRule.findOne({ isActive: true });
  if (!rule) {
    rule = await EligibilityRule.create({
      ruleName: 'Standard National Blood Donation Eligibility Rule',
      minAge: 18,
      maxAge: 65,
      minWeightKg: 50,
      minMaleGapDays: 90,
      minFemaleGapDays: 120,
      minHemoglobin: 12.5,
      isActive: true,
      isDefault: true,
    });
  }
  return rule;
};

/**
 * Calculates next eligible donation date and current eligibility
 * @param {Object} user 
 * @param {Object} donorProfile 
 * @returns {Promise<{isEligible: boolean, nextEligibleDate: Date, daysRemaining: number, reasons: string[]}>}
 */
export const calculateDonorEligibility = async (user, donorProfile) => {
  const rule = await getActiveEligibilityRule();
  const reasons = [];
  let isEligible = true;

  // 1. Age Check
  if (user.dob) {
    const ageDiffMs = Date.now() - new Date(user.dob).getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < rule.minAge) {
      isEligible = false;
      reasons.push(`Minimum age for blood donation is ${rule.minAge} years (current: ${age}).`);
    } else if (age > rule.maxAge) {
      isEligible = false;
      reasons.push(`Maximum age for blood donation is ${rule.maxAge} years (current: ${age}).`);
    }
  }

  // 2. Weight Check
  if (donorProfile?.weightKg && donorProfile.weightKg < rule.minWeightKg) {
    isEligible = false;
    reasons.push(`Minimum weight requirement is ${rule.minWeightKg} kg (current: ${donorProfile.weightKg} kg).`);
  }

  // 3. Gap Days Check based on gender
  const gapDays = user.gender === 'FEMALE' ? rule.minFemaleGapDays : rule.minMaleGapDays;
  let nextEligibleDate = new Date();
  let daysRemaining = 0;

  if (donorProfile?.lastDonationDate) {
    const lastDate = new Date(donorProfile.lastDonationDate);
    nextEligibleDate = new Date(lastDate.getTime() + gapDays * 24 * 60 * 60 * 1000);
    const msRemaining = nextEligibleDate.getTime() - Date.now();

    if (msRemaining > 0) {
      isEligible = false;
      daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      reasons.push(
        `Required interval of ${gapDays} days not met. Eligible in ${daysRemaining} day(s) on ${nextEligibleDate.toLocaleDateString()}.`
      );
    }
  }

  // 4. Availability Check
  if (donorProfile && donorProfile.isAvailable === false) {
    isEligible = false;
    reasons.push('Donor status is currently set to Unavailable.');
  }

  return {
    isEligible,
    nextEligibleDate,
    daysRemaining: Math.max(0, daysRemaining),
    gapDaysRequired: gapDays,
    ruleApplied: rule.ruleName,
    reasons,
  };
};
