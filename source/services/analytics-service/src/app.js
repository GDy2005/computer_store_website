import express from 'express';
import {createDashboardController} from './controllers/dashboardController.js';
import {createDashboardRouter} from './routes/dashboardRoutes.js';
import {createDashboardService} from './services/dashboardService.js';
import {createDashboardRepository} from './repositories/dashboardRepository.js';

export function buildApp({models}) {
  const router = express.Router();
  const dashboardRepository = createDashboardRepository(models);
  const dashboardService = createDashboardService({dashboardRepository});
  const controller = createDashboardController({dashboardService});
  router.use(createDashboardRouter(controller));
  return router;
}
