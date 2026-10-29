import mongoose from 'mongoose';

const {Schema} = mongoose;

const dashboardMonthlySchema = new Schema(
  {
    month: {type: String, required: true, unique: true},
    newUsers: {type: Number, default: 0},
    orderCount: {type: Number, default: 0},
    revenue: {type: Number, default: 0},
    profit: {type: Number, default: 0},
    productsSold: {type: Number, default: 0}
  },
  {timestamps: true, versionKey: false}
);

export function getDashboardMonthlyModel(connection) {
  return connection.models.DashboardMonthly || connection.model(
    'DashboardMonthly',
    dashboardMonthlySchema,
    'dashboard_monthly'
  );
}
