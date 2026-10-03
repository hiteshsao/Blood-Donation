import { DonorProfile, BloodBank, BloodInventory, BloodRequest, User } from '../models/index.js';
import { calculateDistanceKm } from '../utils/geo.util.js';

/**
 * Mask phone number for privacy until request is accepted.
 * E.g., "9876543210" -> "98******10", "+919876543210" -> "+919******10"
 *
 * @param {string} phone
 * @returns {string}
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';

  if (clean.startsWith('+')) {
    // Preserve country prefix e.g. +91
    const prefix = clean.slice(0, 3);
    const remainder = clean.slice(3);
    if (remainder.length <= 4) return `${prefix}****`;
    const start = remainder.slice(0, 1);
    const end = remainder.slice(-2);
    const stars = '*'.repeat(Math.max(4, remainder.length - 3));
    return `${prefix}${start}${stars}${end}`;
  }

  const start = clean.slice(0, 2);
  const end = clean.slice(-2);
  const stars = '*'.repeat(Math.max(4, clean.length - 4));
  return `${start}${stars}${end}`;
};

/**
 * Search voluntary blood donors.
 *
 * Requirements:
 * - Only VERIFIED, available, eligible donors
 * - Sensitive data hidden (passwords, tokens, medical notes)
 * - Phone number masked UNLESS the requester has an ACCEPTED blood request with this donor
 * - $geoNear used for geospatial search when lat & lng are provided, sorting by distance
 * - Pagination support
 *
 * @param {Object} params
 * @param {string} [params.bloodGroup]
 * @param {string} [params.city]
 * @param {number} [params.lat]
 * @param {number} [params.lng]
 * @param {number} [params.radiusKm=50]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.currentUserId]
 * @returns {Promise<Object>}
 */
export const searchDonors = async ({
  bloodGroup,
  city,
  lat,
  lng,
  radiusKm = 50,
  page = 1,
  limit = 20,
  currentUserId = null,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;
  const radiusNum = Math.max(1, parseFloat(radiusKm) || 50);

  const now = new Date();
  const minDob = new Date(now.getFullYear() - 65, now.getMonth(), now.getDate());
  const maxDob = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());

  // Base eligibility and availability filter for DonorProfile
  const donorFilter = {
    isAvailable: true,
    status: 'ACTIVE',
    $or: [{ verificationStatus: 'VERIFIED' }, { isVerified: true }],
    nextEligibleDate: { $lte: now },
  };

  // Weight eligibility: >= 50 kg or unspecified
  donorFilter.$and = [
    {
      $or: [
        { weight: { $gte: 50 } },
        { weight: null },
        { weight: { $exists: false } },
      ],
    },
    {
      $or: [
        { dob: { $gte: minDob, $lte: maxDob } },
        { dob: null },
        { dob: { $exists: false } },
      ],
    },
  ];

  if (bloodGroup) {
    donorFilter.bloodGroup = bloodGroup.trim().toUpperCase();
  }

  // Pre-fetch accepted donor IDs for current requester if authenticated
  const acceptedDonorUserIds = new Set();
  if (currentUserId) {
    const acceptedRequests = await BloodRequest.find({
      requester: currentUserId,
      $or: [
        { 'assignedDonors.status': 'ACCEPTED' },
        { 'matchedDonors.status': 'ACCEPTED' },
      ],
    }).select('assignedDonors matchedDonors');

    acceptedRequests.forEach((reqDoc) => {
      const donors = [...(reqDoc.assignedDonors || []), ...(reqDoc.matchedDonors || [])];
      donors.forEach((d) => {
        if (d.status === 'ACCEPTED' && d.donor) {
          acceptedDonorUserIds.add(d.donor.toString());
        }
      });
    });
  }

  const hasGeoCoords =
    lat !== undefined &&
    lng !== undefined &&
    lat !== null &&
    lng !== null &&
    !isNaN(Number(lat)) &&
    !isNaN(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180;

  let donorsList = [];
  let total = 0;

  if (hasGeoCoords) {
    // ── Geospatial search with $geoNear ──
    const geoPipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: radiusNum * 1000,
          spherical: true,
          query: donorFilter,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $match: {
          'userDetails.status': { $ne: 'BLOCKED' },
          'userDetails.isBlocked': { $ne: true },
          ...(city
            ? {
                $or: [
                  { 'userDetails.city': new RegExp(city.trim(), 'i') },
                  { 'userDetails.address.city': new RegExp(city.trim(), 'i') },
                ],
              }
            : {}),
        },
      },
      {
        $project: {
          _id: 1,
          bloodGroup: 1,
          isAvailable: 1,
          isVerified: 1,
          verificationStatus: 1,
          totalDonations: 1,
          nextEligibleDate: 1,
          location: 1,
          distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
          user: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            phone: { $ifNull: ['$userDetails.phone', '$userDetails.mobile'] },
            city: '$userDetails.city',
            state: '$userDetails.state',
            profilePhoto: { $ifNull: ['$userDetails.profilePhotoUrl', '$userDetails.profilePhoto'] },
            isEmailVerified: '$userDetails.isEmailVerified',
          },
        },
      },
      { $sort: { distanceKm: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    try {
      const [aggResult] = await DonorProfile.aggregate(geoPipeline);
      donorsList = aggResult?.data || [];
      total = aggResult?.totalCount?.[0]?.count || 0;
    } catch (geoError) {
      console.warn(`[SearchService] $geoNear fallback for donors: ${geoError.message}`);

      // Resilient fallback for unindexed test environments
      const rawDonors = await DonorProfile.find(donorFilter)
        .populate('user', 'name phone mobile city state profilePhoto profilePhotoUrl status isBlocked isEmailVerified');

      const filtered = rawDonors
        .filter((d) => {
          if (!d.user || d.user.status === 'BLOCKED' || d.user.isBlocked) return false;
          if (city) {
            const cRegex = new RegExp(city.trim(), 'i');
            if (!cRegex.test(d.user.city || '')) return false;
          }
          return true;
        })
        .map((d) => {
          const coords = d.location?.coordinates || [0, 0];
          const dist = calculateDistanceKm([Number(lng), Number(lat)], coords);
          return {
            _id: d._id,
            bloodGroup: d.bloodGroup,
            isAvailable: d.isAvailable,
            isVerified: d.isVerified,
            verificationStatus: d.verificationStatus,
            totalDonations: d.totalDonations,
            nextEligibleDate: d.nextEligibleDate,
            location: d.location,
            distanceKm: dist,
            user: {
              _id: d.user._id,
              name: d.user.name,
              phone: d.user.phone || d.user.mobile,
              city: d.user.city,
              state: d.user.state,
              profilePhoto: d.user.profilePhotoUrl || d.user.profilePhoto,
              isEmailVerified: d.user.isEmailVerified,
            },
          };
        })
        .filter((d) => d.distanceKm <= radiusNum)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      total = filtered.length;
      donorsList = filtered.slice(skip, skip + limitNum);
    }
  } else {
    // ── Non-geospatial search (city and/or bloodGroup) ──
    const pipeline = [
      { $match: donorFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $match: {
          'userDetails.status': { $ne: 'BLOCKED' },
          'userDetails.isBlocked': { $ne: true },
          ...(city
            ? {
                $or: [
                  { 'userDetails.city': new RegExp(city.trim(), 'i') },
                  { 'userDetails.address.city': new RegExp(city.trim(), 'i') },
                ],
              }
            : {}),
        },
      },
      {
        $project: {
          _id: 1,
          bloodGroup: 1,
          isAvailable: 1,
          isVerified: 1,
          verificationStatus: 1,
          totalDonations: 1,
          nextEligibleDate: 1,
          location: 1,
          user: {
            _id: '$userDetails._id',
            name: '$userDetails.name',
            phone: { $ifNull: ['$userDetails.phone', '$userDetails.mobile'] },
            city: '$userDetails.city',
            state: '$userDetails.state',
            profilePhoto: { $ifNull: ['$userDetails.profilePhotoUrl', '$userDetails.profilePhoto'] },
            isEmailVerified: '$userDetails.isEmailVerified',
          },
        },
      },
      { $sort: { totalDonations: -1, _id: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [aggResult] = await DonorProfile.aggregate(pipeline);
    donorsList = aggResult?.data || [];
    total = aggResult?.totalCount?.[0]?.count || 0;
  }

  // ── Privacy & Phone Masking Sanitization ──
  const sanitizedDonors = donorsList.map((donor) => {
    const donorUserId = donor.user?._id?.toString();
    const isAccepted = donorUserId ? acceptedDonorUserIds.has(donorUserId) : false;
    const rawPhone = donor.user?.phone || '';

    return {
      _id: donor._id,
      bloodGroup: donor.bloodGroup,
      isAvailable: donor.isAvailable,
      isVerified: donor.isVerified ?? (donor.verificationStatus === 'VERIFIED'),
      totalDonations: donor.totalDonations || 0,
      nextEligibleDate: donor.nextEligibleDate,
      distanceKm: donor.distanceKm !== undefined ? donor.distanceKm : null,
      location: donor.location,
      user: {
        _id: donor.user?._id,
        name: donor.user?.name,
        city: donor.user?.city,
        state: donor.user?.state,
        profilePhoto: donor.user?.profilePhoto || null,
        phone: isAccepted ? rawPhone : maskPhone(rawPhone),
        phoneMasked: !isAccepted,
        isEmailVerified: donor.user?.isEmailVerified || false,
      },
    };
  });

  const totalPages = Math.ceil(total / limitNum);

  return {
    donors: sanitizedDonors,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    filters: {
      bloodGroup: bloodGroup || null,
      city: city || null,
      lat: hasGeoCoords ? Number(lat) : null,
      lng: hasGeoCoords ? Number(lng) : null,
      radiusKm: hasGeoCoords ? radiusNum : null,
    },
  };
};

/**
 * Search verified blood banks with per-blood-group stock availability.
 *
 * Requirements:
 * - VERIFIED banks only
 * - Include stock availability per blood group
 * - $geoNear sorting by distance when coordinates provided
 * - Pagination support
 *
 * @param {Object} params
 * @param {string} [params.bloodGroup]
 * @param {string} [params.city]
 * @param {number} [params.lat]
 * @param {number} [params.lng]
 * @param {number} [params.radiusKm=50]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<Object>}
 */
export const searchBloodBanks = async ({
  bloodGroup,
  city,
  lat,
  lng,
  radiusKm = 50,
  page = 1,
  limit = 20,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;
  const radiusNum = Math.max(1, parseFloat(radiusKm) || 50);

  // Bank verification filter
  const bankFilter = {
    $or: [
      { isVerified: true },
      { verificationStatus: { $in: ['VERIFIED', 'APPROVED'] } },
      { status: { $in: ['VERIFIED', 'APPROVED'] } },
    ],
  };

  if (city) {
    const cityRegex = new RegExp(city.trim(), 'i');
    bankFilter.$and = [
      {
        $or: [{ city: cityRegex }, { 'address.city': cityRegex }],
      },
    ];
  }

  const hasGeoCoords =
    lat !== undefined &&
    lng !== undefined &&
    lat !== null &&
    lng !== null &&
    !isNaN(Number(lat)) &&
    !isNaN(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180;

  let banksList = [];
  let total = 0;

  if (hasGeoCoords) {
    const geoPipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          distanceField: 'distanceMeters',
          maxDistance: radiusNum * 1000,
          spherical: true,
          query: bankFilter,
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          registrationNumber: 1,
          licenseNumber: 1,
          address: 1,
          city: 1,
          state: 1,
          pincode: 1,
          operatingHours: 1,
          location: 1,
          isVerified: 1,
          verificationStatus: 1,
          distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
        },
      },
      { $sort: { distanceKm: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    try {
      const [aggResult] = await BloodBank.aggregate(geoPipeline);
      banksList = aggResult?.data || [];
      total = aggResult?.totalCount?.[0]?.count || 0;
    } catch (geoError) {
      console.warn(`[SearchService] $geoNear fallback for blood banks: ${geoError.message}`);

      const rawBanks = await BloodBank.find(bankFilter);
      const filtered = rawBanks
        .map((b) => {
          const coords = b.location?.coordinates || [0, 0];
          const dist = calculateDistanceKm([Number(lng), Number(lat)], coords);
          return {
            ...b.toObject(),
            distanceKm: dist,
          };
        })
        .filter((b) => b.distanceKm <= radiusNum)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      total = filtered.length;
      banksList = filtered.slice(skip, skip + limitNum);
    }
  } else {
    // Non-geo search
    const [banks, count] = await Promise.all([
      BloodBank.find(bankFilter)
        .select(
          '_id name email phone registrationNumber licenseNumber address city state pincode operatingHours location isVerified verificationStatus'
        )
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum),
      BloodBank.countDocuments(bankFilter),
    ]);

    banksList = banks.map((b) => ({ ...b.toObject(), distanceKm: null }));
    total = count;
  }

  // ── Attach stock availability per group for each bank ──
  const bankIds = banksList.map((b) => b._id);
  const inventories = await BloodInventory.find({
    bloodBank: { $in: bankIds },
  }).select('bloodBank bloodGroup available unitsAvailable reserved unitsReserved expired unitsExpired lastUpdated');

  // Group inventory records by blood bank
  const inventoryByBank = new Map();
  for (const inv of inventories) {
    const bankIdStr = inv.bloodBank.toString();
    if (!inventoryByBank.has(bankIdStr)) {
      inventoryByBank.set(bankIdStr, []);
    }
    inventoryByBank.get(bankIdStr).push(inv);
  }

  const allBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const resultsWithStock = banksList.map((bank) => {
    const bankIdStr = bank._id.toString();
    const bankInvs = inventoryByBank.get(bankIdStr) || [];

    // Map each group's stock
    const stock = {};
    allBloodGroups.forEach((bg) => {
      stock[bg] = 0;
    });

    let totalAvailableUnits = 0;
    bankInvs.forEach((item) => {
      const units = item.unitsAvailable ?? item.available ?? 0;
      stock[item.bloodGroup] = units;
      totalAvailableUnits += units;
    });

    const requestedGroupUpper = bloodGroup ? bloodGroup.trim().toUpperCase() : null;

    return {
      _id: bank._id,
      name: bank.name,
      email: bank.email || '',
      phone: bank.phone || '',
      registrationNumber: bank.registrationNumber || bank.licenseNumber || '',
      address: bank.address || {
        line: '',
        city: bank.city || '',
        state: bank.state || '',
        pincode: bank.pincode || '',
      },
      city: bank.city || bank.address?.city || '',
      state: bank.state || bank.address?.state || '',
      pincode: bank.pincode || bank.address?.pincode || '',
      operatingHours: bank.operatingHours || '24/7',
      location: bank.location,
      isVerified: bank.isVerified ?? true,
      distanceKm: bank.distanceKm,
      stock,
      totalUnitsAvailable: totalAvailableUnits,
      requestedGroupAvailability: requestedGroupUpper
        ? {
            bloodGroup: requestedGroupUpper,
            availableUnits: stock[requestedGroupUpper] || 0,
            hasStock: (stock[requestedGroupUpper] || 0) > 0,
          }
        : null,
    };
  });

  const totalPages = Math.ceil(total / limitNum);

  return {
    bloodBanks: resultsWithStock,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    filters: {
      bloodGroup: bloodGroup || null,
      city: city || null,
      lat: hasGeoCoords ? Number(lat) : null,
      lng: hasGeoCoords ? Number(lng) : null,
      radiusKm: hasGeoCoords ? radiusNum : null,
    },
  };
};

/**
 * Aggregate total blood unit availability across banks.
 *
 * Requirements:
 * - Aggregates total units across verified blood banks
 * - Supports optional city filter
 * - Supports optional bloodGroup filter
 *
 * @param {Object} params
 * @param {string} [params.bloodGroup]
 * @param {string} [params.city]
 * @returns {Promise<Object>}
 */
export const getAggregateAvailability = async ({ bloodGroup, city } = {}) => {
  // Step 1: Find all verified blood banks (filtered by city if provided)
  const bankFilter = {
    $or: [
      { isVerified: true },
      { verificationStatus: { $in: ['VERIFIED', 'APPROVED'] } },
      { status: { $in: ['VERIFIED', 'APPROVED'] } },
    ],
  };

  if (city) {
    const cityRegex = new RegExp(city.trim(), 'i');
    bankFilter.$and = [
      {
        $or: [{ city: cityRegex }, { 'address.city': cityRegex }],
      },
    ];
  }

  const verifiedBanks = await BloodBank.find(bankFilter).select('_id name city state');
  const bankIds = verifiedBanks.map((b) => b._id);

  if (bankIds.length === 0) {
    return {
      totalUnitsAvailable: 0,
      totalUnitsReserved: 0,
      verifiedBanksCount: 0,
      city: city || null,
      bloodGroup: bloodGroup ? bloodGroup.trim().toUpperCase() : null,
      groups: [],
      breakdown: {},
    };
  }

  // Step 2: Build inventory aggregation match filter
  const invMatch = {
    bloodBank: { $in: bankIds },
  };

  const requestedGroupUpper = bloodGroup ? bloodGroup.trim().toUpperCase() : null;
  if (requestedGroupUpper) {
    invMatch.bloodGroup = requestedGroupUpper;
  }

  const aggregationPipeline = [
    { $match: invMatch },
    {
      $group: {
        _id: '$bloodGroup',
        totalAvailable: {
          $sum: { $ifNull: ['$unitsAvailable', { $ifNull: ['$available', 0] }] },
        },
        totalReserved: {
          $sum: { $ifNull: ['$unitsReserved', { $ifNull: ['$reserved', 0] }] },
        },
        totalExpired: {
          $sum: { $ifNull: ['$unitsExpired', { $ifNull: ['$expired', 0] }] },
        },
        banksWithStock: {
          $addToSet: {
            $cond: [
              { $gt: [{ $ifNull: ['$unitsAvailable', '$available'] }, 0] },
              '$bloodBank',
              '$$REMOVE',
            ],
          },
        },
        allBanks: { $addToSet: '$bloodBank' },
      },
    },
    {
      $project: {
        bloodGroup: '$_id',
        totalAvailable: 1,
        totalReserved: 1,
        totalExpired: 1,
        banksWithStockCount: { $size: '$banksWithStock' },
        reportingBanksCount: { $size: '$allBanks' },
        _id: 0,
      },
    },
    { $sort: { bloodGroup: 1 } },
  ];

  const groupResults = await BloodInventory.aggregate(aggregationPipeline);

  // Default map with all 8 blood groups (or single if filtered)
  const allGroups = requestedGroupUpper
    ? [requestedGroupUpper]
    : ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const breakdownMap = {};
  allGroups.forEach((bg) => {
    breakdownMap[bg] = {
      bloodGroup: bg,
      totalAvailable: 0,
      totalReserved: 0,
      banksWithStockCount: 0,
    };
  });

  let overallAvailable = 0;
  let overallReserved = 0;

  groupResults.forEach((item) => {
    breakdownMap[item.bloodGroup] = {
      bloodGroup: item.bloodGroup,
      totalAvailable: item.totalAvailable || 0,
      totalReserved: item.totalReserved || 0,
      banksWithStockCount: item.banksWithStockCount || 0,
    };
    overallAvailable += item.totalAvailable || 0;
    overallReserved += item.totalReserved || 0;
  });

  const groupsList = allGroups.map((bg) => breakdownMap[bg]);

  return {
    totalUnitsAvailable: overallAvailable,
    totalUnitsReserved: overallReserved,
    verifiedBanksCount: verifiedBanks.length,
    city: city || null,
    bloodGroup: requestedGroupUpper || null,
    groups: groupsList,
    breakdown: breakdownMap,
  };
};
