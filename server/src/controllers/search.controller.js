import {
  searchDonors,
  searchBloodBanks,
  getAggregateAvailability,
} from '../services/search.service.js';

/**
 * GET /api/v1/search/donors
 * Search voluntary blood donors with filters (bloodGroup, city, lat, lng, radiusKm).
 * Automatically masks phone numbers unless requester has an accepted request with the donor.
 */
export const getDonors = async (req, res, next) => {
  try {
    const { bloodGroup, city, lat, lng, radiusKm, page, limit } = req.query;

    const result = await searchDonors({
      bloodGroup,
      city,
      lat: lat !== undefined ? Number(lat) : undefined,
      lng: lng !== undefined ? Number(lng) : undefined,
      radiusKm: radiusKm !== undefined ? Number(radiusKm) : 50,
      page: page !== undefined ? parseInt(page, 10) : 1,
      limit: limit !== undefined ? parseInt(limit, 10) : 20,
      currentUserId: req.user?._id || null,
    });

    res.status(200).json({
      success: true,
      message: 'Donors retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/search/blood-banks
 * Search verified blood banks with per-group stock availability and distance sorting.
 */
export const getBloodBanks = async (req, res, next) => {
  try {
    const { bloodGroup, city, lat, lng, radiusKm, page, limit } = req.query;

    const result = await searchBloodBanks({
      bloodGroup,
      city,
      lat: lat !== undefined ? Number(lat) : undefined,
      lng: lng !== undefined ? Number(lng) : undefined,
      radiusKm: radiusKm !== undefined ? Number(radiusKm) : 50,
      page: page !== undefined ? parseInt(page, 10) : 1,
      limit: limit !== undefined ? parseInt(limit, 10) : 20,
    });

    res.status(200).json({
      success: true,
      message: 'Blood banks retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/search/availability
 * Aggregate total units available across verified blood banks.
 */
export const getAvailability = async (req, res, next) => {
  try {
    const { bloodGroup, city } = req.query;

    const result = await getAggregateAvailability({
      bloodGroup,
      city,
    });

    res.status(200).json({
      success: true,
      message: 'Aggregate availability retrieved successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
