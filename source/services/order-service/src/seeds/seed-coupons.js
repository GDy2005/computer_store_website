import mongoose from 'mongoose';

import {
  getCouponModel
} from '../models/coupon.model.js';

const connection = await mongoose
  .createConnection(
    process.env.MONGODB_URI,
    {dbName: process.env.DB_NAME || 'order_db'}
  )
  .asPromise();

const Coupon = getCouponModel(connection);

const coupons = [
  {
    code: 'WELCOME10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maximumDiscount: 500000,
    minimumOrder: 1000000,
    usageLimit: 100,
    isActive: true,
    startsAt: new Date('2025-01-01T00:00:00.000Z'),
    expiresAt: new Date('2030-12-31T23:59:59.999Z')
  },
  {
    code: 'SAVE200K',
    discountType: 'FIXED',
    discountValue: 200000,
    maximumDiscount: null,
    minimumOrder: 5000000,
    usageLimit: 50,
    isActive: true,
    startsAt: new Date('2025-01-01T00:00:00.000Z'),
    expiresAt: new Date('2030-12-31T23:59:59.999Z')
  }
];

for (const coupon of coupons) {
  const {code, ...fields} = coupon;

  await Coupon.updateOne(
    {code},
    {
      $set: fields,
      $setOnInsert: {code, usedCount: 0}
    },
    {upsert: true}
  );
}

console.log(`Seeded ${coupons.length} coupons`);
await connection.close();
