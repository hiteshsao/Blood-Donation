import { DonorProfile, Donation, EligibilityRule, Notification, User } from '../models/index.js';

// ─── Eligibility Rule ─────────────────────────────────────────────

/**
 * Retrieve the active eligibility rule from DB, creating a default if none exists.
 * @returns {Promise<Object>}
 */
export const getActiveEligibilityRule = async () => {
  let rule = await EligibilityRule.findOne({ isActive: true, isDefault: true });
  if (!rule) {
    rule = await EligibilityRule.findOne({ isActive: true });
  }
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

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Calculate age from DOB.
 * @param {Date|string|null} dob
 * @returns {number|null}
 */
const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Find donor profile for a user (checks both field names for compat).
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const findDonorProfile = async (userId) => {
  return DonorProfile.findOne({ $or: [{ user: userId }, { userId }] });
};

// ─── Availability ─────────────────────────────────────────────────

/**
 * Set donor availability (explicit boolean).
 * @param {string} userId
 * @param {boolean} isAvailable
 * @returns {Promise<{donorProfile: Object}>}
 */
export const setDonorAvailability = async (userId, isAvailable) => {
  const donorProfile = await findDonorProfile(userId);
  if (!donorProfile) {
    const err = new Error('No donor profile found. Please register as a donor first.');
    err.statusCode = 404;
    throw err;
  }

  donorProfile.isAvailable = isAvailable;
  await donorProfile.save();

  return { donorProfile };
};

// ─── Eligibility Check ───────────────────────────────────────────

/**
 * Full eligibility computation returning structured check results.
 *
 * Rules:
 *   - Age: 18–65
 *   - Weight: >= 50 kg
 *   - Gap: 90 days (male/other), 120 days (female)
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const checkDonorEligibility = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await findDonorProfile(userId);
  const rule = await getActiveEligibilityRule();

  // ── 1. Age ──
  const age = calculateAge(user.dob || donorProfile?.dob);
  let ageEligible = true;
  let ageReason = '';

  if (age === null) {
    ageEligible = true;
    ageReason = 'Date of birth not provided. Please update your profile with your DOB.';
  } else if (age < rule.minAge) {
    ageEligible = false;
    ageReason = `You are ${age} years old. Minimum required age is ${rule.minAge} years.`;
  } else if (age > rule.maxAge) {
    ageEligible = false;
    ageReason = `You are ${age} years old. Maximum permissible age is ${rule.maxAge} years.`;
  } else {
    ageReason = `Age ${age} is within acceptable limits (${rule.minAge}–${rule.maxAge} years).`;
  }

  // ── 2. Weight ──
  const weight = donorProfile?.weight ?? donorProfile?.weightKg ?? null;
  let weightEligible = true;
  let weightReason = '';

  if (weight !== null && weight !== undefined) {
    if (weight < rule.minWeightKg) {
      weightEligible = false;
      weightReason = `Weight ${weight} kg is below minimum requirement (${rule.minWeightKg} kg).`;
    } else {
      weightReason = `Weight satisfies minimum requirement (${rule.minWeightKg} kg).`;
    }
  } else {
    weightReason = 'Weight not recorded. Please update your donor profile.';
  }

  // ── 3. Donation gap ──
  const gapDays = (user.gender === 'FEMALE') ? rule.minFemaleGapDays : rule.minMaleGapDays;

  const latestDonation = await Donation.findOne(
    { donor: userId, verificationStatus: 'VERIFIED' },
  ).sort({ donatedAt: -1 });

  const lastDate = latestDonation?.donatedAt || donorProfile?.lastDonationDate || null;

  let nextEligibleDate = new Date();
  let daysRemaining = 0;
  let gapEligible = true;
  let gapReason = '';

  if (lastDate) {
    nextEligibleDate = new Date(new Date(lastDate).getTime() + gapDays * 86400000);
    const diffMs = nextEligibleDate.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));

    if (daysRemaining > 0) {
      gapEligible = false;
      gapReason = `Next donation allowed after ${gapDays}-day interval (${user.gender === 'FEMALE' ? 'Female: 120 days' : 'Male/Other: 90 days'}). ${daysRemaining} day(s) remaining.`;
    } else {
      gapReason = `Sufficient interval elapsed since last donation on ${new Date(lastDate).toLocaleDateString()}.`;
    }
  } else {
    gapReason = 'No previous donations recorded. You are eligible for your first donation!';
  }

  const isEligible = ageEligible && gapEligible && weightEligible;

  // Sync nextEligibleDate on donor profile
  if (donorProfile) {
    donorProfile.nextEligibleDate = nextEligibleDate;
    await donorProfile.save();
  }

  return {
    isEligible,
    nextEligibleDate,
    daysRemaining,
    reason: isEligible
      ? 'You are eligible to donate blood!'
      : (!gapEligible ? gapReason : (!ageEligible ? ageReason : weightReason)),
    checks: {
      age: {
        eligible: ageEligible,
        currentAge: age,
        requiredRange: `${rule.minAge} – ${rule.maxAge} years`,
        reason: ageReason,
      },
      gap: {
        eligible: gapEligible,
        gapDaysRequired: gapDays,
        lastDonationDate: lastDate,
        nextEligibleDate,
        daysRemaining,
        genderRuleApplied: user.gender === 'FEMALE' ? 'Female (120 days)' : 'Male/Other (90 days)',
        reason: gapReason,
      },
      weight: {
        eligible: weightEligible,
        currentWeightKg: weight,
        minWeightKg: rule.minWeightKg,
        reason: weightReason,
      },
    },
    rule: {
      ruleName: rule.ruleName,
      minAge: rule.minAge,
      maxAge: rule.maxAge,
      minMaleGapDays: rule.minMaleGapDays,
      minFemaleGapDays: rule.minFemaleGapDays,
      minWeightKg: rule.minWeightKg,
      minHemoglobin: rule.minHemoglobin,
    },
  };
};

// ─── Donation History ────────────────────────────────────────────

/**
 * Get paginated donation history for a donor.
 * @param {string} userId
 * @param {Object} opts – { page, limit }
 * @returns {Promise<Object>}
 */
export const getDonorHistory = async (userId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const donorProfile = await findDonorProfile(userId);

  const [donations, total] = await Promise.all([
    Donation.find({ donor: userId })
      .populate('bloodBank', 'name contactNumber address city')
      .populate('hospital', 'name address city')
      .sort({ donatedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Donation.countDocuments({ donor: userId }),
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const totalUnitsDonated = donations.reduce((sum, d) => sum + (d.units || 1), 0);

  // Sync profile stats
  if (donorProfile) {
    const rule = await getActiveEligibilityRule();
    const gapDays = donorProfile.user?.gender === 'FEMALE'
      ? rule.minFemaleGapDays
      : rule.minMaleGapDays;

    // Only update totalDonations if we have the full count
    donorProfile.totalDonations = total;
    if (donations.length > 0) {
      donorProfile.lastDonationDate = donations[0].donatedAt;
      donorProfile.nextEligibleDate = new Date(
        new Date(donations[0].donatedAt).getTime() + gapDays * 86400000
      );
    }
    await donorProfile.save();
  }

  return {
    donations,
    totalDonations: total,
    totalUnitsDonated,
    lastDonationDate: donations[0]?.donatedAt || donorProfile?.lastDonationDate || null,
    nextEligibleDate: donorProfile?.nextEligibleDate || new Date(),
    donorProfile,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

// ─── Dashboard Stats ─────────────────────────────────────────────

/**
 * Aggregate dashboard statistics for a donor.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const getDonorDashboardStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const donorProfile = await findDonorProfile(userId);

  // Aggregate donation stats
  const [statsResult] = await Donation.aggregate([
    { $match: { donor: user._id } },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$units' },
        firstDonation: { $min: '$donatedAt' },
        lastDonation: { $max: '$donatedAt' },
        bloodGroupsHelped: { $addToSet: '$bloodGroup' },
      },
    },
  ]);

  const stats = statsResult || {
    totalDonations: 0,
    totalUnits: 0,
    firstDonation: null,
    lastDonation: null,
    bloodGroupsHelped: [],
  };

  // Monthly donation trend (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyTrend = await Donation.aggregate([
    {
      $match: {
        donor: user._id,
        donatedAt: { $gte: twelveMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$donatedAt' },
          month: { $month: '$donatedAt' },
        },
        count: { $sum: 1 },
        units: { $sum: '$units' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // Eligibility snapshot
  const eligibility = await checkDonorEligibility(userId);

  // Estimated lives saved (1 donation can save up to 3 lives)
  const livesSaved = stats.totalDonations * 3;

  return {
    totalDonations: stats.totalDonations,
    totalUnitsDonated: stats.totalUnits,
    livesSaved,
    firstDonationDate: stats.firstDonation,
    lastDonationDate: stats.lastDonation,
    bloodGroupsHelped: stats.bloodGroupsHelped,
    bloodGroup: donorProfile?.bloodGroup || user.bloodGroup,
    isAvailable: donorProfile?.isAvailable ?? false,
    isEligible: eligibility.isEligible,
    nextEligibleDate: eligibility.nextEligibleDate,
    daysUntilEligible: eligibility.daysRemaining,
    monthlyTrend,
    donorProfile,
  };
};

// ─── Cron Helpers ────────────────────────────────────────────────

/**
 * Reset availability for donors whose nextEligibleDate has passed
 * and who are currently unavailable due to cooldown.
 * Creates in-app notifications for each reset donor.
 *
 * @returns {Promise<{resetCount: number, notifiedIds: string[]}>}
 */
export const resetEligibleDonorAvailability = async () => {
  const now = new Date();

  // Find donors who are unavailable AND whose cooldown has expired
  const donors = await DonorProfile.find({
    isAvailable: false,
    status: 'ACTIVE',
    nextEligibleDate: { $lte: now },
  }).populate('user', 'name email');

  const notifiedIds = [];

  for (const donor of donors) {
    donor.isAvailable = true;
    await donor.save();

    // Create in-app notification
    try {
      await Notification.create({
        user: donor.user?._id || donor.user,
        type: 'DONOR_ELIGIBLE',
        title: 'You Are Eligible to Donate Again!',
        message: `Great news! Your donation cooldown period has ended. You are now eligible to donate blood again. Visit your nearest blood bank to schedule a donation.`,
        channel: 'IN_APP',
        meta: {
          donorProfileId: donor._id,
          nextEligibleDate: donor.nextEligibleDate,
        },
      });
      notifiedIds.push((donor.user?._id || donor.user).toString());
    } catch (notifErr) {
      console.error(`[DonorCron] Failed to notify donor ${donor._id}:`, notifErr.message);
    }
  }

  return { resetCount: donors.length, notifiedIds };
};
