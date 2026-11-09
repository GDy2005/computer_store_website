export function createDashboardRepository({
  DashboardDaily,
  ProductSales,
  UserProjection
}) {
  return {
    findAllDaily() {
      return DashboardDaily.find({}).lean();
    },

    findDailyRange(startDate, endDate) {
      return DashboardDaily.find({
        date: {$gte: startDate, $lte: endDate}
      }).lean();
    },

    findProductSales(filter = {}) {
      return ProductSales.find(filter).lean();
    },

    countUsers() {
      return UserProjection.countDocuments({counted: true});
    }
  };
}
