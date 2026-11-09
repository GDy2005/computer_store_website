import {sendSuccess} from '@store/http-response';
import {DashboardQueryDTO} from '../dto/request/DashboardQueryDTO.js';

export function createDashboardController({dashboardService}) {
  return {
    async summary(req, res, next) {
      try {
        const data = await dashboardService.summary();
        sendSuccess(res, {
          message: 'Dashboard summary retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async analytics(req, res, next) {
      try {
        const data = await dashboardService.analytics(
          DashboardQueryDTO.from(req.validatedQuery)
        );
        sendSuccess(res, {
          message: 'Dashboard analytics retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
