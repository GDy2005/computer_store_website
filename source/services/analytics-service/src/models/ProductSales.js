import mongoose from 'mongoose';

const {Schema} = mongoose;

const productSalesSchema = new Schema(
  {
    date: {type: String, required: true},
    productId: {type: String, required: true},
    productName: {type: String, required: true},
    categoryName: {type: String, required: true},
    quantity: {type: Number, default: 0},
    revenue: {type: Number, default: 0},
    profit: {type: Number, default: 0},
    orderCount: {type: Number, default: 0}
  },
  {timestamps: true, versionKey: false}
);

productSalesSchema.index({date: 1, productId: 1}, {unique: true});
productSalesSchema.index({date: 1});
productSalesSchema.index({quantity: -1});

export function getProductSalesModel(connection) {
  return connection.models.ProductSales || connection.model(
    'ProductSales',
    productSalesSchema,
    'product_sales'
  );
}
