import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  Donation,
  BloodRequest,
  EmergencyRequest,
  DonorProfile,
  User,
  BloodInventory,
} from '../models/index.js';

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Normalizes user-supplied report type into standard identifier.
 */
export const normalizeReportType = (type = '') => {
  const t = String(type).trim().toLowerCase().replace(/_/g, '-');
  if (['donations', 'donations-per-month', 'monthly-donations'].includes(t)) {
    return 'donations-per-month';
  }
  if (['requests', 'requests-by-status', 'request-status'].includes(t)) {
    return 'requests-by-status';
  }
  if (
    [
      'demand-supply',
      'demand-vs-supply',
      'blood-group-demand-supply',
      'blood-group-demand-vs-supply',
    ].includes(t)
  ) {
    return 'blood-group-demand-supply';
  }
  if (['top-donors', 'donors', 'top-donor'].includes(t)) {
    return 'top-donors';
  }
  if (['city-activity', 'city-wise-activity', 'cities', 'city'].includes(t)) {
    return 'city-wise-activity';
  }
  if (['fulfillment', 'fulfillment-rate', 'fulfillment-rates'].includes(t)) {
    return 'fulfillment-rate';
  }
  if (
    [
      'emergency-response',
      'emergency-response-time',
      'response-time',
      'emergencies',
    ].includes(t)
  ) {
    return 'emergency-response-time';
  }
  if (['all', 'full', 'summary', 'full-report'].includes(t)) {
    return 'all';
  }
  return null;
};

/**
 * Parses and validates date range boundaries.
 */
export const parseDateRange = (from, to) => {
  let fromDate = null;
  let toDate = null;

  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      fromDate = d;
    }
  }

  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      toDate = d;
    }
  }

  return { fromDate, toDate };
};

/**
 * Constructs MongoDB $gte / $lte date match filter.
 */
export const buildDateMatch = (field, fromDate, toDate) => {
  if (!fromDate && !toDate) return {};
  const filter = {};
  if (fromDate) filter.$gte = fromDate;
  if (toDate) filter.$lte = toDate;
  return { [field]: filter };
};

// ──────────────────────────────────────────────────────────
// 1. DONATIONS PER MONTH AGGREGATION
// ──────────────────────────────────────────────────────────

export const getDonationsPerMonth = async (fromDate, toDate) => {
  const match = {
    verificationStatus: { $ne: 'REJECTED' },
    ...buildDateMatch('donatedAt', fromDate, toDate),
  };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$donatedAt' },
          month: { $month: '$donatedAt' },
        },
        donationsCount: { $sum: 1 },
        unitsDonated: { $sum: '$units' },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        monthLabel: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            {
              $cond: [
                { $lt: ['$_id.month', 10] },
                { $concat: ['0', { $toString: '$_id.month' }] },
                { $toString: '$_id.month' },
              ],
            },
          ],
        },
        donationsCount: 1,
        unitsDonated: 1,
      },
    },
    { $sort: { year: 1, month: 1 } },
  ];

  return await Donation.aggregate(pipeline);
};

// ──────────────────────────────────────────────────────────
// 2. REQUESTS BY STATUS AGGREGATION
// ──────────────────────────────────────────────────────────

export const getRequestsByStatus = async (fromDate, toDate) => {
  const match = {
    ...buildDateMatch('createdAt', fromDate, toDate),
  };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalUnits: { $sum: '$units' },
      },
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
        totalUnits: 1,
      },
    },
    { $sort: { count: -1 } },
  ];

  return await BloodRequest.aggregate(pipeline);
};

// ──────────────────────────────────────────────────────────
// 3. BLOOD GROUP DEMAND VS SUPPLY AGGREGATION
// ──────────────────────────────────────────────────────────

export const getBloodGroupDemandVsSupply = async (fromDate, toDate) => {
  const requestMatch = buildDateMatch('createdAt', fromDate, toDate);
  const donationMatch = {
    verificationStatus: { $ne: 'REJECTED' },
    ...buildDateMatch('donatedAt', fromDate, toDate),
  };

  const [demandResults, supplyResults, inventoryResults] = await Promise.all([
    BloodRequest.aggregate([
      { $match: requestMatch },
      {
        $group: {
          _id: '$bloodGroup',
          demandedUnits: { $sum: '$units' },
          requestCount: { $sum: 1 },
        },
      },
    ]),
    Donation.aggregate([
      { $match: donationMatch },
      {
        $group: {
          _id: '$bloodGroup',
          suppliedUnits: { $sum: '$units' },
          donationCount: { $sum: 1 },
        },
      },
    ]),
    BloodInventory.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          availableStock: { $sum: { $ifNull: ['$available', '$unitsAvailable'] } },
        },
      },
    ]),
  ]);

  const demandMap = new Map(demandResults.map((r) => [r._id, r]));
  const supplyMap = new Map(supplyResults.map((r) => [r._id, r]));
  const inventoryMap = new Map(inventoryResults.map((r) => [r._id, r]));

  return ALL_BLOOD_GROUPS.map((bloodGroup) => {
    const demand = demandMap.get(bloodGroup) || { demandedUnits: 0, requestCount: 0 };
    const supply = supplyMap.get(bloodGroup) || { suppliedUnits: 0, donationCount: 0 };
    const inv = inventoryMap.get(bloodGroup) || { availableStock: 0 };

    const demandedUnits = demand.demandedUnits || 0;
    const suppliedUnits = supply.suppliedUnits || 0;
    const availableStock = inv.availableStock || 0;
    const netBalance = suppliedUnits - demandedUnits;
    const fulfillmentRate =
      demandedUnits > 0
        ? Math.min(100, Number(((suppliedUnits / demandedUnits) * 100).toFixed(1)))
        : 100;

    return {
      bloodGroup,
      demandedUnits,
      requestCount: demand.requestCount || 0,
      suppliedUnits,
      donationCount: supply.donationCount || 0,
      availableStock,
      netBalance,
      status: netBalance >= 0 ? 'SURPLUS' : 'DEFICIT',
      fulfillmentRate,
    };
  });
};

// ──────────────────────────────────────────────────────────
// 4. TOP DONORS AGGREGATION
// ──────────────────────────────────────────────────────────

export const getTopDonors = async (fromDate, toDate, limit = 10) => {
  const donationMatch = {
    verificationStatus: { $ne: 'REJECTED' },
    ...buildDateMatch('donatedAt', fromDate, toDate),
  };

  const pipeline = [
    { $match: donationMatch },
    {
      $group: {
        _id: '$donor',
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$units' },
        lastDonatedAt: { $max: '$donatedAt' },
        bloodGroups: { $addToSet: '$bloodGroup' },
      },
    },
    { $sort: { totalUnits: -1, totalDonations: -1 } },
    { $limit: Number(limit) || 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'donorprofiles',
        localField: '_id',
        foreignField: 'user',
        as: 'profile',
      },
    },
    { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        donorId: '$_id',
        name: { $ifNull: ['$user.name', 'Anonymous Donor'] },
        email: { $ifNull: ['$user.email', 'N/A'] },
        phone: { $ifNull: ['$user.phone', { $ifNull: ['$user.mobile', 'N/A'] }] },
        city: {
          $ifNull: ['$user.city', { $ifNull: ['$user.address.city', 'N/A'] }],
        },
        bloodGroup: {
          $ifNull: [
            '$user.bloodGroup',
            { $ifNull: ['$profile.bloodGroup', { $arrayElemAt: ['$bloodGroups', 0] }] },
          ],
        },
        totalDonations: 1,
        totalUnits: 1,
        lastDonatedAt: 1,
        isVerified: {
          $ifNull: ['$profile.isVerified', { $ifNull: ['$user.isVerified', false] }],
        },
      },
    },
  ];

  const results = await Donation.aggregate(pipeline);

  // If no donation records found in the specified range, optionally fallback to DonorProfile records
  if (results.length === 0 && !fromDate && !toDate) {
    const profileDonors = await DonorProfile.find({ totalDonations: { $gt: 0 } })
      .populate('user', 'name email phone mobile city bloodGroup isVerified')
      .sort({ totalDonations: -1 })
      .limit(Number(limit) || 10)
      .lean();

    return profileDonors.map((p) => ({
      donorId: p.user?._id || p._id,
      name: p.user?.name || 'Anonymous Donor',
      email: p.user?.email || 'N/A',
      phone: p.user?.phone || p.user?.mobile || 'N/A',
      city: p.user?.city || 'N/A',
      bloodGroup: p.bloodGroup || p.user?.bloodGroup || 'O+',
      totalDonations: p.totalDonations || 0,
      totalUnits: p.totalDonations || 0,
      lastDonatedAt: p.lastDonationDate || p.updatedAt,
      isVerified: p.isVerified || false,
    }));
  }

  return results;
};

// ──────────────────────────────────────────────────────────
// 5. CITY-WISE ACTIVITY AGGREGATION
// ──────────────────────────────────────────────────────────

export const getCityWiseActivity = async (fromDate, toDate) => {
  const requestMatch = {
    city: { $exists: true, $ne: '' },
    ...buildDateMatch('createdAt', fromDate, toDate),
  };

  const donationMatch = {
    verificationStatus: { $ne: 'REJECTED' },
    ...buildDateMatch('donatedAt', fromDate, toDate),
  };

  const emergencyMatch = {
    city: { $exists: true, $ne: '' },
    ...buildDateMatch('createdAt', fromDate, toDate),
  };

  const [requestCities, donationCities, emergencyCities] = await Promise.all([
    BloodRequest.aggregate([
      { $match: requestMatch },
      {
        $group: {
          _id: { $toUpper: { $trim: { input: '$city' } } },
          requestsCount: { $sum: 1 },
          unitsRequested: { $sum: '$units' },
          fulfilledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'FULFILLED'] }, 1, 0] },
          },
        },
      },
    ]),
    Donation.aggregate([
      { $match: donationMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'donor',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          units: 1,
          city: {
            $toUpper: {
              $trim: {
                input: {
                  $ifNull: ['$user.city', { $ifNull: ['$user.address.city', 'UNKNOWN'] }],
                },
              },
            },
          },
        },
      },
      {
        $match: { city: { $ne: 'UNKNOWN' } },
      },
      {
        $group: {
          _id: '$city',
          donationsCount: { $sum: 1 },
          unitsDonated: { $sum: '$units' },
        },
      },
    ]),
    EmergencyRequest.aggregate([
      { $match: emergencyMatch },
      {
        $group: {
          _id: { $toUpper: { $trim: { input: '$city' } } },
          emergenciesCount: { $sum: 1 },
          emergencyUnits: { $sum: '$units' },
        },
      },
    ]),
  ]);

  const cityMap = new Map();

  const getOrCreate = (city) => {
    if (!cityMap.has(city)) {
      cityMap.set(city, {
        city,
        requestsCount: 0,
        unitsRequested: 0,
        fulfilledCount: 0,
        donationsCount: 0,
        unitsDonated: 0,
        emergenciesCount: 0,
        emergencyUnits: 0,
        totalActivity: 0,
      });
    }
    return cityMap.get(city);
  };

  requestCities.forEach((r) => {
    if (r._id) {
      const entry = getOrCreate(r._id);
      entry.requestsCount = r.requestsCount || 0;
      entry.unitsRequested = r.unitsRequested || 0;
      entry.fulfilledCount = r.fulfilledCount || 0;
    }
  });

  donationCities.forEach((d) => {
    if (d._id) {
      const entry = getOrCreate(d._id);
      entry.donationsCount = d.donationsCount || 0;
      entry.unitsDonated = d.unitsDonated || 0;
    }
  });

  emergencyCities.forEach((e) => {
    if (e._id) {
      const entry = getOrCreate(e._id);
      entry.emergenciesCount = e.emergenciesCount || 0;
      entry.emergencyUnits = e.emergencyUnits || 0;
    }
  });

  const results = Array.from(cityMap.values()).map((c) => ({
    ...c,
    totalActivity: c.requestsCount + c.donationsCount + c.emergenciesCount,
  }));

  results.sort((a, b) => b.totalActivity - a.totalActivity);
  return results;
};

// ──────────────────────────────────────────────────────────
// 6. FULFILLMENT RATE AGGREGATION
// ──────────────────────────────────────────────────────────

export const getFulfillmentRate = async (fromDate, toDate) => {
  const requestMatch = buildDateMatch('createdAt', fromDate, toDate);
  const emergencyMatch = buildDateMatch('createdAt', fromDate, toDate);

  const [requestStatsArr, emergencyStatsArr] = await Promise.all([
    BloodRequest.aggregate([
      { $match: requestMatch },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalUnitsRequested: { $sum: '$units' },
          fulfilledRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'FULFILLED'] }, 1, 0] },
          },
          fulfilledUnits: {
            $sum: { $cond: [{ $eq: ['$status', 'FULFILLED'] }, '$units', 0] },
          },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] },
          },
          inProgressRequests: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [
                      'IN_PROGRESS',
                      'APPROVED',
                      'DONOR_ASSIGNED',
                      'DONOR_FOUND',
                      'MATCHING',
                      'PROCESSING',
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          cancelledOrRejectedRequests: {
            $sum: {
              $cond: [{ $in: ['$status', ['REJECTED', 'CANCELLED']] }, 1, 0],
            },
          },
        },
      },
    ]),
    EmergencyRequest.aggregate([
      { $match: emergencyMatch },
      {
        $group: {
          _id: null,
          totalEmergencies: { $sum: 1 },
          totalUnitsRequested: { $sum: '$units' },
          fulfilledEmergencies: {
            $sum: { $cond: [{ $eq: ['$status', 'FULFILLED'] }, 1, 0] },
          },
          activeEmergencies: {
            $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] },
          },
          expiredEmergencies: {
            $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const reqStats = requestStatsArr[0] || {
    totalRequests: 0,
    totalUnitsRequested: 0,
    fulfilledRequests: 0,
    fulfilledUnits: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    cancelledOrRejectedRequests: 0,
  };

  const emStats = emergencyStatsArr[0] || {
    totalEmergencies: 0,
    totalUnitsRequested: 0,
    fulfilledEmergencies: 0,
    activeEmergencies: 0,
    expiredEmergencies: 0,
  };

  const requestFulfillmentRate =
    reqStats.totalRequests > 0
      ? Number(((reqStats.fulfilledRequests / reqStats.totalRequests) * 100).toFixed(1))
      : 0;

  const unitsFulfillmentRate =
    reqStats.totalUnitsRequested > 0
      ? Number(((reqStats.fulfilledUnits / reqStats.totalUnitsRequested) * 100).toFixed(1))
      : 0;

  const emergencyFulfillmentRate =
    emStats.totalEmergencies > 0
      ? Number(((emStats.fulfilledEmergencies / emStats.totalEmergencies) * 100).toFixed(1))
      : 0;

  const totalAll = reqStats.totalRequests + emStats.totalEmergencies;
  const fulfilledAll = reqStats.fulfilledRequests + emStats.fulfilledEmergencies;
  const overallFulfillmentRate =
    totalAll > 0 ? Number(((fulfilledAll / totalAll) * 100).toFixed(1)) : 0;

  return {
    bloodRequests: {
      totalRequests: reqStats.totalRequests,
      fulfilledRequests: reqStats.fulfilledRequests,
      pendingRequests: reqStats.pendingRequests,
      inProgressRequests: reqStats.inProgressRequests,
      cancelledOrRejectedRequests: reqStats.cancelledOrRejectedRequests,
      totalUnitsRequested: reqStats.totalUnitsRequested,
      fulfilledUnits: reqStats.fulfilledUnits,
      fulfillmentRatePercentage: requestFulfillmentRate,
      unitsFulfillmentRatePercentage: unitsFulfillmentRate,
    },
    emergencies: {
      totalEmergencies: emStats.totalEmergencies,
      fulfilledEmergencies: emStats.fulfilledEmergencies,
      activeEmergencies: emStats.activeEmergencies,
      expiredEmergencies: emStats.expiredEmergencies,
      fulfillmentRatePercentage: emergencyFulfillmentRate,
    },
    overall: {
      totalRequests: totalAll,
      fulfilledRequests: fulfilledAll,
      overallFulfillmentRatePercentage: overallFulfillmentRate,
    },
  };
};

// ──────────────────────────────────────────────────────────
// 7. AVERAGE RESPONSE TIME FOR EMERGENCIES AGGREGATION
// ──────────────────────────────────────────────────────────

export const getAverageEmergencyResponseTime = async (fromDate, toDate) => {
  const match = buildDateMatch('createdAt', fromDate, toDate);

  const [donorResponseStats, emergencyResolutionStats] = await Promise.all([
    EmergencyRequest.aggregate([
      { $match: match },
      { $unwind: '$notifiedDonors' },
      {
        $match: {
          'notifiedDonors.respondedAt': { $ne: null, $exists: true },
        },
      },
      {
        $project: {
          emergencyId: '$_id',
          bloodGroup: '$bloodGroup',
          urgency: '$urgency',
          response: '$notifiedDonors.response',
          responseTimeMs: {
            $max: [
              0,
              {
                $subtract: [
                  '$notifiedDonors.respondedAt',
                  { $ifNull: ['$notifiedDonors.notifiedAt', '$createdAt'] },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          acceptedCount: {
            $sum: { $cond: [{ $eq: ['$response', 'ACCEPTED'] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$response', 'REJECTED'] }, 1, 0] },
          },
          avgResponseTimeMs: { $avg: '$responseTimeMs' },
          minResponseTimeMs: { $min: '$responseTimeMs' },
          maxResponseTimeMs: { $max: '$responseTimeMs' },
        },
      },
    ]),
    EmergencyRequest.aggregate([
      {
        $match: {
          ...match,
          status: 'FULFILLED',
        },
      },
      {
        $project: {
          resolutionTimeMs: {
            $max: [0, { $subtract: ['$updatedAt', '$createdAt'] }],
          },
        },
      },
      {
        $group: {
          _id: null,
          fulfilledCount: { $sum: 1 },
          avgResolutionTimeMs: { $avg: '$resolutionTimeMs' },
          minResolutionTimeMs: { $min: '$resolutionTimeMs' },
          maxResolutionTimeMs: { $max: '$resolutionTimeMs' },
        },
      },
    ]),
  ]);

  const donorStats = donorResponseStats[0] || {
    totalResponses: 0,
    acceptedCount: 0,
    rejectedCount: 0,
    avgResponseTimeMs: 0,
    minResponseTimeMs: 0,
    maxResponseTimeMs: 0,
  };

  const resStats = emergencyResolutionStats[0] || {
    fulfilledCount: 0,
    avgResolutionTimeMs: 0,
    minResolutionTimeMs: 0,
    maxResolutionTimeMs: 0,
  };

  const avgMs = Math.round(donorStats.avgResponseTimeMs || 0);
  const avgSec = Math.round(avgMs / 1000);
  const avgMin = Math.round((avgMs / 60000) * 10) / 10;

  const formatDuration = (ms) => {
    if (!ms || ms <= 0) return '0s';
    const totalSec = Math.round(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return {
    donorResponses: {
      totalResponses: donorStats.totalResponses,
      acceptedCount: donorStats.acceptedCount,
      rejectedCount: donorStats.rejectedCount,
      avgResponseTimeMs: avgMs,
      avgResponseTimeSeconds: avgSec,
      avgResponseTimeMinutes: avgMin,
      avgResponseTimeFormatted: formatDuration(avgMs),
      minResponseTimeSeconds: Math.round((donorStats.minResponseTimeMs || 0) / 1000),
      maxResponseTimeSeconds: Math.round((donorStats.maxResponseTimeMs || 0) / 1000),
    },
    emergencyResolution: {
      fulfilledCount: resStats.fulfilledCount,
      avgResolutionTimeMs: Math.round(resStats.avgResolutionTimeMs || 0),
      avgResolutionTimeMinutes: Math.round(((resStats.avgResolutionTimeMs || 0) / 60000) * 10) / 10,
      avgResolutionTimeFormatted: formatDuration(resStats.avgResolutionTimeMs || 0),
    },
  };
};

// ──────────────────────────────────────────────────────────
// COMPREHENSIVE REPORTS BUNDLER
// ──────────────────────────────────────────────────────────

export const getAllReports = async ({ from, to, type, limit = 10 } = {}) => {
  const { fromDate, toDate } = parseDateRange(from, to);
  const normalizedType = type ? normalizeReportType(type) : null;

  // If a specific report was requested
  if (normalizedType && normalizedType !== 'all') {
    switch (normalizedType) {
      case 'donations-per-month':
        return {
          type: normalizedType,
          donationsPerMonth: await getDonationsPerMonth(fromDate, toDate),
        };
      case 'requests-by-status':
        return {
          type: normalizedType,
          requestsByStatus: await getRequestsByStatus(fromDate, toDate),
        };
      case 'blood-group-demand-supply':
        return {
          type: normalizedType,
          bloodGroupDemandVsSupply: await getBloodGroupDemandVsSupply(fromDate, toDate),
        };
      case 'top-donors':
        return {
          type: normalizedType,
          topDonors: await getTopDonors(fromDate, toDate, limit),
        };
      case 'city-wise-activity':
        return {
          type: normalizedType,
          cityWiseActivity: await getCityWiseActivity(fromDate, toDate),
        };
      case 'fulfillment-rate':
        return {
          type: normalizedType,
          fulfillmentRate: await getFulfillmentRate(fromDate, toDate),
        };
      case 'emergency-response-time':
        return {
          type: normalizedType,
          averageEmergencyResponseTime: await getAverageEmergencyResponseTime(fromDate, toDate),
        };
    }
  }

  // Otherwise, run all 7 aggregation pipelines in parallel
  const [
    donationsPerMonth,
    requestsByStatus,
    bloodGroupDemandVsSupply,
    topDonors,
    cityWiseActivity,
    fulfillmentRate,
    averageEmergencyResponseTime,
  ] = await Promise.all([
    getDonationsPerMonth(fromDate, toDate),
    getRequestsByStatus(fromDate, toDate),
    getBloodGroupDemandVsSupply(fromDate, toDate),
    getTopDonors(fromDate, toDate, limit),
    getCityWiseActivity(fromDate, toDate),
    getFulfillmentRate(fromDate, toDate),
    getAverageEmergencyResponseTime(fromDate, toDate),
  ]);

  return {
    donationsPerMonth,
    requestsByStatus,
    bloodGroupDemandVsSupply,
    topDonors,
    cityWiseActivity,
    fulfillmentRate,
    averageEmergencyResponseTime,
  };
};

// ──────────────────────────────────────────────────────────
// EXCEL STREAMING EXPORT (ExcelJS)
// ──────────────────────────────────────────────────────────

export const streamExcelReport = async ({ type, from, to, res }) => {
  const normalizedType = normalizeReportType(type) || 'all';
  const { fromDate, toDate } = parseDateRange(from, to);

  const reportData = await getAllReports({ from, to, limit: 50 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LifeDrop Transfusion Network';
  workbook.lastModifiedBy = 'Admin Desk';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper styles
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '991B1B' },
  };

  const headerFont = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFF' },
  };

  const applyHeaderStyle = (sheet, colCount) => {
    const row = sheet.getRow(1);
    row.height = 28;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'B91C1C' } },
        bottom: { style: 'medium', color: { argb: '7F1D1D' } },
        left: { style: 'thin', color: { argb: 'B91C1C' } },
        right: { style: 'thin', color: { argb: 'B91C1C' } },
      };
    }
  };

  const applyZebraRows = (sheet, startRow = 2) => {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber >= startRow) {
        row.height = 20;
        const isEven = rowNumber % 2 === 0;
        row.eachCell((cell) => {
          if (isEven) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F8FAFC' },
            };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
          cell.font = { name: 'Segoe UI', size: 10 };
          if (!cell.alignment) {
            cell.alignment = { vertical: 'middle' };
          }
        });
      }
    });
  };

  // 1. Monthly Donations Sheet
  if (normalizedType === 'all' || normalizedType === 'donations-per-month') {
    const sheet = workbook.addWorksheet('Monthly Donations');
    sheet.columns = [
      { header: 'Period (YYYY-MM)', key: 'monthLabel', width: 22 },
      { header: 'Year', key: 'year', width: 12 },
      { header: 'Month', key: 'month', width: 12 },
      { header: 'Donation Sessions', key: 'donationsCount', width: 20 },
      { header: 'Units Collected', key: 'unitsDonated', width: 20 },
    ];
    (reportData.donationsPerMonth || []).forEach((item) => sheet.addRow(item));
    applyHeaderStyle(sheet, 5);
    applyZebraRows(sheet);
  }

  // 2. Requests by Status Sheet
  if (normalizedType === 'all' || normalizedType === 'requests-by-status') {
    const sheet = workbook.addWorksheet('Requests by Status');
    sheet.columns = [
      { header: 'Request Status', key: 'status', width: 25 },
      { header: 'Total Requests', key: 'count', width: 18 },
      { header: 'Units Requested', key: 'totalUnits', width: 18 },
    ];
    (reportData.requestsByStatus || []).forEach((item) => sheet.addRow(item));
    applyHeaderStyle(sheet, 3);
    applyZebraRows(sheet);
  }

  // 3. Demand vs Supply Sheet
  if (normalizedType === 'all' || normalizedType === 'blood-group-demand-supply') {
    const sheet = workbook.addWorksheet('Demand vs Supply');
    sheet.columns = [
      { header: 'Blood Group', key: 'bloodGroup', width: 14 },
      { header: 'Demanded Units', key: 'demandedUnits', width: 18 },
      { header: 'Request Count', key: 'requestCount', width: 16 },
      { header: 'Supplied Units', key: 'suppliedUnits', width: 18 },
      { header: 'Donations Count', key: 'donationCount', width: 18 },
      { header: 'Available Stock', key: 'availableStock', width: 18 },
      { header: 'Net Balance', key: 'netBalance', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Fulfillment Rate (%)', key: 'fulfillmentRate', width: 22 },
    ];
    (reportData.bloodGroupDemandVsSupply || []).forEach((item) => sheet.addRow(item));
    applyHeaderStyle(sheet, 9);
    applyZebraRows(sheet);
  }

  // 4. Top Donors Sheet
  if (normalizedType === 'all' || normalizedType === 'top-donors') {
    const sheet = workbook.addWorksheet('Top Donors');
    sheet.columns = [
      { header: 'Donor Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Blood Group', key: 'bloodGroup', width: 14 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Total Donations', key: 'totalDonations', width: 18 },
      { header: 'Units Donated', key: 'totalUnits', width: 18 },
      { header: 'Verified', key: 'isVerified', width: 12 },
    ];
    (reportData.topDonors || []).forEach((item) => {
      sheet.addRow({
        ...item,
        isVerified: item.isVerified ? 'YES' : 'NO',
      });
    });
    applyHeaderStyle(sheet, 8);
    applyZebraRows(sheet);
  }

  // 5. City-wise Activity Sheet
  if (normalizedType === 'all' || normalizedType === 'city-wise-activity') {
    const sheet = workbook.addWorksheet('City Activity');
    sheet.columns = [
      { header: 'City', key: 'city', width: 22 },
      { header: 'Requests Count', key: 'requestsCount', width: 18 },
      { header: 'Units Requested', key: 'unitsRequested', width: 18 },
      { header: 'Requests Fulfilled', key: 'fulfilledCount', width: 20 },
      { header: 'Donations Count', key: 'donationsCount', width: 18 },
      { header: 'Units Donated', key: 'unitsDonated', width: 18 },
      { header: 'Emergencies Count', key: 'emergenciesCount', width: 20 },
      { header: 'Total Activity Score', key: 'totalActivity', width: 22 },
    ];
    (reportData.cityWiseActivity || []).forEach((item) => sheet.addRow(item));
    applyHeaderStyle(sheet, 8);
    applyZebraRows(sheet);
  }

  // 6. Fulfillment Rate Sheet
  if (normalizedType === 'all' || normalizedType === 'fulfillment-rate') {
    const sheet = workbook.addWorksheet('Fulfillment Rate');
    sheet.columns = [
      { header: 'Category / Metric', key: 'metric', width: 32 },
      { header: 'Value', key: 'value', width: 22 },
      { header: 'Notes / Rate', key: 'rate', width: 28 },
    ];
    const fr = reportData.fulfillmentRate || {};
    const br = fr.bloodRequests || {};
    const em = fr.emergencies || {};
    const ov = fr.overall || {};

    const rows = [
      {
        metric: 'Blood Requests: Total',
        value: br.totalRequests || 0,
        rate: '',
      },
      {
        metric: 'Blood Requests: Fulfilled',
        value: br.fulfilledRequests || 0,
        rate: `${br.fulfillmentRatePercentage || 0}%`,
      },
      {
        metric: 'Blood Requests: Pending',
        value: br.pendingRequests || 0,
        rate: '',
      },
      {
        metric: 'Blood Requests: In Progress',
        value: br.inProgressRequests || 0,
        rate: '',
      },
      {
        metric: 'Blood Units: Requested vs Fulfilled',
        value: `${br.fulfilledUnits || 0} / ${br.totalUnitsRequested || 0} units`,
        rate: `${br.unitsFulfillmentRatePercentage || 0}% units fulfilled`,
      },
      {
        metric: 'Emergencies: Total',
        value: em.totalEmergencies || 0,
        rate: '',
      },
      {
        metric: 'Emergencies: Fulfilled',
        value: em.fulfilledEmergencies || 0,
        rate: `${em.fulfillmentRatePercentage || 0}%`,
      },
      {
        metric: 'Emergencies: Active Live',
        value: em.activeEmergencies || 0,
        rate: '',
      },
      {
        metric: 'Overall Requests Fulfilled',
        value: `${ov.fulfilledRequests || 0} / ${ov.totalRequests || 0}`,
        rate: `${ov.overallFulfillmentRatePercentage || 0}% overall fulfillment`,
      },
    ];

    rows.forEach((r) => sheet.addRow(r));
    applyHeaderStyle(sheet, 3);
    applyZebraRows(sheet);
  }

  // 7. Emergency Response Sheet
  if (normalizedType === 'all' || normalizedType === 'emergency-response-time') {
    const sheet = workbook.addWorksheet('Emergency Response Time');
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 25 },
      { header: 'Details', key: 'details', width: 30 },
    ];
    const ert = reportData.averageEmergencyResponseTime || {};
    const dr = ert.donorResponses || {};
    const er = ert.emergencyResolution || {};

    const rows = [
      {
        metric: 'Total Donor Responses',
        value: dr.totalResponses || 0,
        details: 'Recorded emergency notifications',
      },
      {
        metric: 'Accepted Responses',
        value: dr.acceptedCount || 0,
        details: 'Voluntary acceptances',
      },
      {
        metric: 'Declined Responses',
        value: dr.rejectedCount || 0,
        details: 'Donor declined or unavailable',
      },
      {
        metric: 'Average Donor Response Time',
        value: dr.avgResponseTimeFormatted || '0s',
        details: `${dr.avgResponseTimeSeconds || 0} seconds (${dr.avgResponseTimeMinutes || 0} min)`,
      },
      {
        metric: 'Fastest Response Time',
        value: `${dr.minResponseTimeSeconds || 0}s`,
        details: 'Minimum response duration',
      },
      {
        metric: 'Longest Response Time',
        value: `${dr.maxResponseTimeSeconds || 0}s`,
        details: 'Maximum response duration',
      },
      {
        metric: 'Fulfilled Emergencies',
        value: er.fulfilledCount || 0,
        details: 'Successfully supplied emergencies',
      },
      {
        metric: 'Average Emergency Resolution Time',
        value: er.avgResolutionTimeFormatted || '0s',
        details: `${er.avgResolutionTimeMinutes || 0} minutes to complete fulfillment`,
      },
    ];

    rows.forEach((r) => sheet.addRow(r));
    applyHeaderStyle(sheet, 3);
    applyZebraRows(sheet);
  }

  // Stream directly to response
  const filename = `lifedrop-report-${normalizedType}-${Date.now()}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');

  await workbook.xlsx.write(res);
  res.end();
};

// ──────────────────────────────────────────────────────────
// PDF STREAMING EXPORT (pdfkit)
// ──────────────────────────────────────────────────────────

export const streamPdfReport = async ({ type, from, to, res }) => {
  const normalizedType = normalizeReportType(type) || 'all';
  const { fromDate, toDate } = parseDateRange(from, to);

  const reportData = await getAllReports({ from, to, limit: 15 });

  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true,
  });

  const filename = `lifedrop-report-${normalizedType}-${Date.now()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 80;

  // 1. Draw Brand Header
  const drawBrandHeader = (titleText) => {
    // Top Crimson Accent Banner
    doc.rect(40, 40, contentWidth, 54).fill('#991B1B');

    doc
      .fillColor('#FFFFFF')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('LIFEDROP CLINICAL TRANSFUSION NETWORK', 55, 48, { width: contentWidth - 30 });

    doc
      .fillColor('#FEE2E2')
      .fontSize(9)
      .font('Helvetica')
      .text(
        'Automated Executive Analytics & Clinical Inventory Intelligence',
        55,
        70,
        { width: contentWidth - 30 }
      );

    // Meta Information Sub-bar
    const dateRangeLabel =
      fromDate && toDate
        ? `${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`
        : fromDate
        ? `Since ${fromDate.toISOString().slice(0, 10)}`
        : toDate
        ? `Up to ${toDate.toISOString().slice(0, 10)}`
        : 'All Time Historical';

    doc
      .rect(40, 94, contentWidth, 24)
      .fill('#F1F5F9');

    doc
      .fillColor('#334155')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text(`REPORT: ${titleText.toUpperCase()}`, 55, 102);

    doc
      .font('Helvetica')
      .text(`FILTER: ${dateRangeLabel}`, 280, 102);

    doc
      .text(`GENERATED: ${new Date().toUTCString().slice(0, 22)}`, 430, 102, {
        align: 'right',
        width: 80,
      });

    doc.y = 130;
  };

  // Helper to ensure enough vertical space or trigger new page
  const ensureSpace = (neededHeight) => {
    if (doc.y + neededHeight > doc.page.height - 50) {
      doc.addPage();
      drawBrandHeader(normalizedType);
    }
  };

  // Helper table drawer
  const drawTable = ({ title, headers, rows, colWidths }) => {
    ensureSpace(60);

    if (title) {
      doc
        .fillColor('#991B1B')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(title, 40, doc.y);
      doc.y += 6;
    }

    const tableStartY = doc.y;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    doc.rect(40, tableStartY, tableWidth, 20).fill('#1E293B');

    let x = 40;
    headers.forEach((h, idx) => {
      doc
        .fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(h, x + 4, tableStartY + 6, {
          width: colWidths[idx] - 8,
          align: idx === 0 ? 'left' : 'center',
        });
      x += colWidths[idx];
    });

    let currentY = tableStartY + 20;

    if (!rows || rows.length === 0) {
      doc.rect(40, currentY, tableWidth, 20).fill('#FFFFFF');
      doc
        .fillColor('#64748B')
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text('No data available for the specified range.', 50, currentY + 6);
      currentY += 20;
    } else {
      rows.forEach((r, rowIdx) => {
        if (currentY + 20 > doc.page.height - 50) {
          doc.addPage();
          drawBrandHeader(normalizedType);
          currentY = doc.y;

          // Redraw header on new page
          doc.rect(40, currentY, tableWidth, 20).fill('#1E293B');
          let subX = 40;
          headers.forEach((h, hIdx) => {
            doc
              .fillColor('#FFFFFF')
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(h, subX + 4, currentY + 6, {
                width: colWidths[hIdx] - 8,
                align: hIdx === 0 ? 'left' : 'center',
              });
            subX += colWidths[hIdx];
          });
          currentY += 20;
        }

        const isEven = rowIdx % 2 === 0;
        doc
          .rect(40, currentY, tableWidth, 18)
          .fill(isEven ? '#FFFFFF' : '#F8FAFC');

        let cellX = 40;
        r.forEach((val, cIdx) => {
          doc
            .fillColor('#1E293B')
            .fontSize(8)
            .font('Helvetica')
            .text(String(val ?? ''), cellX + 4, currentY + 5, {
              width: colWidths[cIdx] - 8,
              align: cIdx === 0 ? 'left' : 'center',
            });
          cellX += colWidths[cIdx];
        });

        currentY += 18;
      });
    }

    doc.y = currentY + 14;
  };

  // Initial Header
  drawBrandHeader(
    normalizedType === 'all'
      ? 'Comprehensive Clinical Analytics'
      : normalizedType.replace(/-/g, ' ')
  );

  // SECTION 1: Monthly Donations
  if (normalizedType === 'all' || normalizedType === 'donations-per-month') {
    const rows = (reportData.donationsPerMonth || []).map((d) => [
      d.monthLabel || `${d.year}-${d.month}`,
      String(d.year),
      String(d.month),
      String(d.donationsCount),
      String(d.unitsDonated),
    ]);
    drawTable({
      title: '1. Donations Collected Per Month',
      headers: ['Period (YYYY-MM)', 'Year', 'Month', 'Donations Count', 'Units Collected'],
      rows,
      colWidths: [130, 80, 80, 110, 115],
    });
  }

  // SECTION 2: Requests by Status
  if (normalizedType === 'all' || normalizedType === 'requests-by-status') {
    const rows = (reportData.requestsByStatus || []).map((r) => [
      r.status,
      String(r.count),
      String(r.totalUnits),
    ]);
    drawTable({
      title: '2. Blood Requests by Status',
      headers: ['Request Status', 'Total Requests', 'Units Requested'],
      rows,
      colWidths: [215, 150, 150],
    });
  }

  // SECTION 3: Blood Group Demand vs Supply
  if (normalizedType === 'all' || normalizedType === 'blood-group-demand-supply') {
    const rows = (reportData.bloodGroupDemandVsSupply || []).map((b) => [
      b.bloodGroup,
      String(b.demandedUnits),
      String(b.suppliedUnits),
      String(b.availableStock),
      b.netBalance >= 0 ? `+${b.netBalance}` : String(b.netBalance),
      b.status,
      `${b.fulfillmentRate}%`,
    ]);
    drawTable({
      title: '3. Blood Group Demand vs Supply Overview',
      headers: [
        'Blood Group',
        'Demanded',
        'Supplied',
        'In Stock',
        'Net Balance',
        'Status',
        'Fulfillment',
      ],
      rows,
      colWidths: [75, 70, 70, 70, 75, 75, 80],
    });
  }

  // SECTION 4: Top Donors
  if (normalizedType === 'all' || normalizedType === 'top-donors') {
    const rows = (reportData.topDonors || []).map((d) => [
      d.name || 'Anonymous',
      d.bloodGroup || 'N/A',
      d.city || 'N/A',
      String(d.totalDonations || 0),
      String(d.totalUnits || 0),
      d.isVerified ? 'VERIFIED' : 'PENDING',
    ]);
    drawTable({
      title: '4. Top Voluntary Donors Leaderboard',
      headers: ['Donor Name', 'Blood Group', 'City', 'Donations', 'Units Donated', 'Status'],
      rows,
      colWidths: [155, 65, 95, 65, 65, 70],
    });
  }

  // SECTION 5: City-wise Activity
  if (normalizedType === 'all' || normalizedType === 'city-wise-activity') {
    const rows = (reportData.cityWiseActivity || []).slice(0, 15).map((c) => [
      c.city || 'Unknown',
      String(c.requestsCount || 0),
      String(c.donationsCount || 0),
      String(c.emergenciesCount || 0),
      String(c.fulfilledCount || 0),
      String(c.totalActivity || 0),
    ]);
    drawTable({
      title: '5. Regional & City-Wise Transfusion Activity',
      headers: [
        'City',
        'Requests',
        'Donations',
        'Emergencies',
        'Fulfilled',
        'Activity Score',
      ],
      rows,
      colWidths: [135, 75, 75, 75, 75, 80],
    });
  }

  // SECTION 6: Fulfillment Rates
  if (normalizedType === 'all' || normalizedType === 'fulfillment-rate') {
    const fr = reportData.fulfillmentRate || {};
    const br = fr.bloodRequests || {};
    const em = fr.emergencies || {};
    const ov = fr.overall || {};

    const rows = [
      ['Standard Blood Requests', `${br.fulfilledRequests || 0} / ${br.totalRequests || 0}`, `${br.fulfillmentRatePercentage || 0}%`],
      ['Blood Units Delivered', `${br.fulfilledUnits || 0} / ${br.totalUnitsRequested || 0} units`, `${br.unitsFulfillmentRatePercentage || 0}%`],
      ['Emergency Alerts', `${em.fulfilledEmergencies || 0} / ${em.totalEmergencies || 0}`, `${em.fulfillmentRatePercentage || 0}%`],
      ['Overall Transfusion Fulfillment', `${ov.fulfilledRequests || 0} / ${ov.totalRequests || 0}`, `${ov.overallFulfillmentRatePercentage || 0}%`],
    ];

    drawTable({
      title: '6. Operational Fulfillment Rates',
      headers: ['Fulfillment Metric', 'Completed / Total', 'Fulfillment Percentage'],
      rows,
      colWidths: [215, 150, 150],
    });
  }

  // SECTION 7: Emergency Response Time
  if (normalizedType === 'all' || normalizedType === 'emergency-response-time') {
    const ert = reportData.averageEmergencyResponseTime || {};
    const dr = ert.donorResponses || {};
    const er = ert.emergencyResolution || {};

    const rows = [
      ['Total Donor Responses Recorded', String(dr.totalResponses || 0)],
      ['Accepted voluntary dispatches', String(dr.acceptedCount || 0)],
      ['Average Donor Response Time', dr.avgResponseTimeFormatted || '0s'],
      ['Fastest Response Recorded', `${dr.minResponseTimeSeconds || 0} seconds`],
      ['Average Full Resolution Time', er.avgResolutionTimeFormatted || '0s'],
    ];

    drawTable({
      title: '7. Emergency Response & Dispatch Latency',
      headers: ['Emergency Metric', 'Operational Time / Count'],
      rows,
      colWidths: [315, 200],
    });
  }

  // Page numbers and footers across all buffered pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .rect(40, doc.page.height - 35, contentWidth, 0.5)
      .fill('#CBD5E1');

    doc
      .fillColor('#64748B')
      .fontSize(7)
      .font('Helvetica')
      .text(
        `Confidential LifeDrop Administrative Intelligence — Page ${i + 1} of ${range.count}`,
        40,
        doc.page.height - 28,
        { width: contentWidth, align: 'center' }
      );
  }

  doc.end();
};
