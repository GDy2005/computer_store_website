import {getDashboardDailyModel} from '../models/DashboardDaily.js';
import {getDashboardMonthlyModel} from '../models/DashboardMonthly.js';
import {getOrderProjectionModel} from '../models/OrderProjection.js';
import {getProductProjectionModel} from '../models/ProductProjection.js';
import {getProductSalesModel} from '../models/ProductSales.js';
import {getUserProjectionModel} from '../models/UserProjection.js';

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
