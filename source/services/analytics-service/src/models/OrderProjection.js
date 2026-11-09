import mongoose from 'mongoose';

const {Schema} = mongoose;

const projectedItemSchema = new Schema(
  {
    productId: {type: String, required: true},
    productName: {type: String, required: true},
    categoryName: {type: String, required: true},
    quantity: {type: Number, required: true},
    revenue: {type: Number, required: true},
    profit: {type: Number, required: true}
  },
  {_id: false}
);

const orderProjectionSchema = new Schema(
  {
    orderId: {type: String, required: true, unique: true},
    orderNumber: {type: String, default: null},
    confirmedDate: {type: String, default: null},
    confirmedMonth: {type: String, default: null},
    status: {type: String, default: null},
    counted: {type: Boolean, default: false},
    cancelled: {type: Boolean, default: false},
    revenue: {type: Number, default: 0},
    profit: {type: Number, default: 0},
    productsSold: {type: Number, default: 0},
    items: {type: [projectedItemSchema], default: []},
    lastStatusAt: {type: Date, default: null}
  },
  {timestamps: true, versionKey: false}
);

orderProjectionSchema.index({confirmedDate: 1, counted: 1});

export function getOrderProjectionModel(connection) {
  return connection.models.OrderProjection || connection.model(
    'OrderProjection',
    orderProjectionSchema,
    'order_projections'
  );
}
