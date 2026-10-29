export function createDashboardController({dashboardService}) {
  return {
    async summary(req, res, next) {
      try {
        const data = await dashboardService.summary();
        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async analytics(req, res, next) {
      try {
        const data = await dashboardService.analytics(req.validatedQuery);
        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
