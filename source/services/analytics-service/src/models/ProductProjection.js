import mongoose from 'mongoose';

const {Schema} = mongoose;

const productProjectionSchema = new Schema(
  {
    productId: {type: String, required: true, unique: true},
    slug: {type: String, default: null},
    name: {type: String, default: null},
    categoryId: {type: String, default: null},
    isActive: {type: Boolean, default: true},
    averageRating: {type: Number, default: 0},
    ratingCount: {type: Number, default: 0}
  },
  {timestamps: true, versionKey: false}
);

export function getProductProjectionModel(connection) {
  return connection.models.ProductProjection || connection.model(
    'ProductProjection',
    productProjectionSchema,
    'product_projections'
  );
}
