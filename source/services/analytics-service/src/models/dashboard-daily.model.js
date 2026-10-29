import mongoose from 'mongoose';

const {Schema} = mongoose;

const dashboardDailySchema = new Schema(
  {
    date: {type: String, required: true, unique: true},
    newUsers: {type: Number, default: 0},
    orderCount: {type: Number, default: 0},
    revenue: {type: Number, default: 0},
    profit: {type: Number, default: 0},
    productsSold: {type: Number, default: 0}
  },
  {timestamps: true, versionKey: false}
);

export function getDashboardDailyModel(connection) {
  return connection.models.DashboardDaily || connection.model(
    'DashboardDaily',
    dashboardDailySchema,
    'dashboard_daily'
  );
}
