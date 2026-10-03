import express from 'express';
import { query } from 'express-validator';
import { optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';
import {
  getDonors,
  getBloodBanks,
  getAvailability,
} from '../controllers/search.controller.js';

const router = express.Router();

const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Geospatial and criteria-based search for verified donors, blood banks, and inventory availability
 */

/**
 * @swagger
 * /api/v1/search/donors:
 *   get:
 *     summary: Search verified, available, and eligible blood donors
 *     description: >
 *       Returns voluntary blood donors who are VERIFIED, available, and eligible (cooldown elapsed, age 18-65, weight >= 50kg).
 *       Hides sensitive data. Phone numbers are masked (e.g. 98******10) unless the requesting user has an ACCEPTED blood request with the donor.
 *       Supports $geoNear spatial radius search when lat & lng are provided, sorting by nearest distance.
 *     tags: [Search]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         description: Filter by blood group
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (case-insensitive)
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude coordinate for proximity search (-90 to 90)
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude coordinate for proximity search (-180 to 180)
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 50
 *         description: Search radius in kilometers (default 50 km)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of donors per page (max 100)
 *     responses:
 *       200:
 *         description: List of verified eligible donors with masked phone numbers
 *       400:
 *         description: Validation error
 */
router.get(
  '/donors',
  optionalAuthenticate,
  [
    query('bloodGroup')
      .optional()
      .trim()
      .toUpperCase()
      .isIn(validBloodGroups)
      .withMessage(`bloodGroup must be one of: ${validBloodGroups.join(', ')}`),
    query('city').optional().trim(),
    query('lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be a valid latitude between -90 and 90'),
    query('lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('lng must be a valid longitude between -180 and 180'),
    query('radiusKm')
      .optional()
      .isFloat({ min: 0.1, max: 1000 })
      .withMessage('radiusKm must be a positive number between 0.1 and 1000'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be an integer >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be an integer between 1 and 100'),
    validateRequest,
  ],
  getDonors
);

/**
 * @swagger
 * /api/v1/search/blood-banks:
 *   get:
 *     summary: Search verified blood banks with real-time stock per blood group
 *     description: >
 *       Returns verified blood banks with per-blood-group stock inventory breakdown.
 *       When lat & lng are supplied, uses MongoDB $geoNear to calculate and sort by proximity (distanceKm).
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         description: Filter or highlight stock for specific blood group
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (case-insensitive)
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           default: 50
 *         description: Proximity radius in km
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of verified blood banks with inventory stock
 *       400:
 *         description: Validation error
 */
router.get(
  '/blood-banks',
  [
    query('bloodGroup')
      .optional()
      .trim()
      .toUpperCase()
      .isIn(validBloodGroups)
      .withMessage(`bloodGroup must be one of: ${validBloodGroups.join(', ')}`),
    query('city').optional().trim(),
    query('lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be a valid latitude between -90 and 90'),
    query('lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('lng must be a valid longitude between -180 and 180'),
    query('radiusKm')
      .optional()
      .isFloat({ min: 0.1, max: 1000 })
      .withMessage('radiusKm must be between 0.1 and 1000'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    validateRequest,
  ],
  getBloodBanks
);

/**
 * @swagger
 * /api/v1/search/availability:
 *   get:
 *     summary: Aggregate total available blood units across verified banks
 *     description: >
 *       Aggregates total available and reserved blood units across all verified blood banks.
 *       Supports optional filtering by city and bloodGroup.
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *         description: Aggregate for specific blood group
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter aggregate by city
 *     responses:
 *       200:
 *         description: Aggregated units and bank counts per blood group
 *       400:
 *         description: Validation error
 */
router.get(
  '/availability',
  [
    query('bloodGroup')
      .optional()
      .trim()
      .toUpperCase()
      .isIn(validBloodGroups)
      .withMessage(`bloodGroup must be one of: ${validBloodGroups.join(', ')}`),
    query('city').optional().trim(),
    validateRequest,
  ],
  getAvailability
);

export default router;
