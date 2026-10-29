import {
  DASHBOARD_TIMEZONE,
  enumerateDates,
  resolveDashboardRange
} from '../projections/date-buckets.js';

function blankTotals() {
  return {
    newUsers: 0,
    orders: 0,
    revenue: 0,
    profit: 0,
    productsSold: 0
  };
}

function addDaily(totals, row) {
  totals.newUsers += row.newUsers || 0;
  totals.orders += row.orderCount || 0;
  totals.revenue += row.revenue || 0;
  totals.profit += row.profit || 0;
  totals.productsSold += row.productsSold || 0;
  return totals;
}

function latestTimestamp(rows) {
  const timestamps = rows
    .map(row => row.updatedAt && new Date(row.updatedAt).getTime())
    .filter(Number.isFinite);
  return timestamps.length
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;
}

function accumulateBreakdown(rows, keyFor, valueFor) {
  const values = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const current = values.get(key) || valueFor(row);
    current.quantity += row.quantity || 0;
    current.revenue += row.revenue || 0;
    current.profit += row.profit || 0;
    values.set(key, current);
  }
  return [...values.values()]
    .filter(value => value.quantity > 0)
    .sort((left, right) =>
      right.quantity - left.quantity || right.revenue - left.revenue
    );
}

export function createDashboardService({
  DashboardDaily,
  ProductSales,
  UserProjection
}) {
  async function summary(now = new Date()) {
    const month = resolveDashboardRange({period: 'month'}, now);
    const [allDaily, currentMonth, sales, totalUsers] = await Promise.all([
      DashboardDaily.find({}).lean(),
      DashboardDaily.find({
        date: {$gte: month.startDate, $lte: month.endDate}
      }).lean(),
      ProductSales.find({quantity: {$gt: 0}}).lean(),
      UserProjection.countDocuments({counted: true})
    ]);

    const totals = allDaily.reduce(addDaily, blankTotals());
    const newUsers = currentMonth.reduce(
      (sum, row) => sum + (row.newUsers || 0),
      0
    );
    const bestSellers = accumulateBreakdown(
      sales,
      row => row.productId,
      row => ({
        productId: row.productId,
        productName: row.productName,
        categoryName: row.categoryName,
        quantity: 0,
        revenue: 0,
        profit: 0
      })
    ).slice(0, 5);

    return {
      totalUsers,
      newUsers,
      totalOrders: totals.orders,
      revenue: totals.revenue,
      profit: totals.profit,
      productsSold: totals.productsSold,
      bestSellers,
      updatedAt: latestTimestamp([...allDaily, ...sales])
    };
  }

  async function analytics(range) {
    const filter = {
      date: {$gte: range.startDate, $lte: range.endDate}
    };
    const [dailyRows, salesRows] = await Promise.all([
      DashboardDaily.find(filter).lean(),
      ProductSales.find(filter).lean()
    ]);
    const dailyByDate = new Map(dailyRows.map(row => [row.date, row]));
    const totals = dailyRows.reduce(addDaily, blankTotals());
    const series = enumerateDates(range.startDate, range.endDate)
      .map(date => {
        const row = dailyByDate.get(date) || {};
        return {
          date,
          label: date.slice(5),
          newUsers: row.newUsers || 0,
          orders: row.orderCount || 0,
          revenue: row.revenue || 0,
          profit: row.profit || 0,
          productsSold: row.productsSold || 0
        };
      });
    const categoryBreakdown = accumulateBreakdown(
      salesRows,
      row => row.categoryName,
      row => ({
        categoryName: row.categoryName,
        quantity: 0,
        revenue: 0,
        profit: 0
      })
    );
    const productBreakdown = accumulateBreakdown(
      salesRows,
      row => row.productId,
      row => ({
        productId: row.productId,
        productName: row.productName,
        categoryName: row.categoryName,
        quantity: 0,
        revenue: 0,
        profit: 0
      })
    ).slice(0, 20);

    return {
      period: range.period,
      range: {
        startDate: range.startDate,
        endDate: range.endDate,
        timezone: DASHBOARD_TIMEZONE
      },
      totals,
      series,
      categoryBreakdown,
      productBreakdown,
      updatedAt: latestTimestamp([...dailyRows, ...salesRows])
    };
  }

  return {summary, analytics};
}
