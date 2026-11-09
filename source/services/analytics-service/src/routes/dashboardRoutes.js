import {Router} from 'express';
import {requireAdmin} from '../middlewares/requireAdmin.js';
import {validateDashboardQuery} from '../validations/dashboardValidation.js';

export function createDashboardRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/admin/dashboard/summary',
    requireAdmin,
    controller.summary
  );
  router.get(
    '/api/v1/admin/dashboard/analytics',
    requireAdmin,
    validateDashboardQuery,
    controller.analytics
  );

  return router;
}
