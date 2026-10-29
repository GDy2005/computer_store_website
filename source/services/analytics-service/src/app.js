import express from 'express';
import {createDashboardController} from './controllers/dashboard.controller.js';
import {createDashboardRouter} from './routes/dashboard.routes.js';
import {createDashboardService} from './services/dashboard.service.js';

export function buildApp({models}) {
  const router = express.Router();
  const dashboardService = createDashboardService(models);
  const controller = createDashboardController({dashboardService});
  router.use(createDashboardRouter(controller));
  return router;
}
