import {getDashboardDailyModel} from '../models/dashboard-daily.model.js';
import {getDashboardMonthlyModel} from '../models/dashboard-monthly.model.js';
import {getOrderProjectionModel} from '../models/order-projection.model.js';
import {getProductProjectionModel} from '../models/product-projection.model.js';
import {getProductSalesModel} from '../models/product-sales.model.js';
import {getUserProjectionModel} from '../models/user-projection.model.js';

export function registerAnalyticsModels(connection) {
  return {
    DashboardDaily: getDashboardDailyModel(connection),
    DashboardMonthly: getDashboardMonthlyModel(connection),
    ProductSales: getProductSalesModel(connection),
    OrderProjection: getOrderProjectionModel(connection),
    UserProjection: getUserProjectionModel(connection),
    ProductProjection: getProductProjectionModel(connection)
  };
}
