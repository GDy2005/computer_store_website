import {AppError} from '@store/validation';
import {resolveDashboardRange} from '../projections/date-buckets.js';

const allowedFields = new Set(['period', 'startDate', 'endDate']);
const periods = new Set(['year', 'quarter', 'month', 'week', 'custom']);

export function validateDashboardQuery(req, res, next) {
  try {
    for (const field of Object.keys(req.query)) {
      if (!allowedFields.has(field)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `Unsupported query field: ${field}`
        );
      }
    }

    const period = req.query.period || 'month';
    if (!periods.has(period)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid period');
    }

    try {
      req.validatedQuery = resolveDashboardRange({
        period,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
    } catch (error) {
      throw new AppError(400, 'VALIDATION_ERROR', error.message);
    }
    next();
  } catch (error) {
    next(error);
  }
}
