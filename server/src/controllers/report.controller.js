import * as reportService from '../services/report.service.js';

/**
 * GET /api/v1/admin/reports
 * Returns comprehensive reports computed via MongoDB aggregation pipelines.
 *
 * Query params:
 *   from  - Start date (e.g. 2026-01-01)
 *   to    - End date (e.g. 2026-12-31)
 *   type  - Optional filter for specific metric:
 *           donations-per-month | requests-by-status | blood-group-demand-supply |
 *           top-donors | city-wise-activity | fulfillment-rate | emergency-response-time | all
 *   limit - Limit for top donors / lists (default 10)
 */
export const getReports = async (req, res, next) => {
  try {
    const { from, to, type, limit } = req.query;

    const data = await reportService.getAllReports({
      from,
      to,
      type,
      limit: limit ? parseInt(limit, 10) : 10,
    });

    res.status(200).json({
      success: true,
      filter: {
        from: from || null,
        to: to || null,
        type: type || 'all',
      },
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /reports/:type/export
 * GET /api/v1/admin/reports/:type/export
 *
 * Exports report in either PDF or Excel format, streaming directly to HTTP response with correct headers.
 *
 * Query params:
 *   format - 'pdf' | 'excel' (or 'xlsx', default: 'pdf')
 *   from   - Start date
 *   to     - End date
 */
export const exportReport = async (req, res, next) => {
  try {
    const type = req.params.type || req.query.type || 'all';
    const format = (req.query.format || 'pdf').toLowerCase();
    const { from, to } = req.query;

    if (format === 'excel' || format === 'xlsx') {
      await reportService.streamExcelReport({ type, from, to, res });
    } else {
      await reportService.streamPdfReport({ type, from, to, res });
    }
  } catch (error) {
    next(error);
  }
};
