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
    code: 'HELLO',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    usageLimit: 10,
    isActive: true
  },
  {
    code: 'SAVE2',
    discountType: 'FIXED',
    discountValue: 200000,
    usageLimit: 10,
    isActive: true
  },
  {
    code: 'TECH5',
    discountType: 'PERCENTAGE',
    discountValue: 5,
    usageLimit: 10,
    isActive: true
  },
  {
    code: 'DEAL1',
    discountType: 'FIXED',
    discountValue: 100000,
    usageLimit: 8,
    isActive: true
  },
  {
    code: 'VIP15',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    usageLimit: 5,
    isActive: true
  }
];

const legacyCodes = new Map([
  ['WELCOME10', 'HELLO'],
  ['SAVE200K', 'SAVE2']
]);

for (const [legacyCode, replacementCode] of legacyCodes) {
  const [legacy, replacement] = await Promise.all([
    Coupon.findOne({code: legacyCode}),
    Coupon.findOne({code: replacementCode})
  ]);

  if (legacy && !replacement) {
    const fields = coupons.find(
      coupon => coupon.code === replacementCode
    );

    Object.assign(legacy, fields, {
      usedCount: Math.min(
        legacy.usedCount,
        fields.usageLimit
      ),
      maximumDiscount: null,
      minimumOrder: 0,
      startsAt: null,
      expiresAt: null
    });

    await legacy.save();
  } else if (legacy && replacement) {
    await Coupon.updateOne(
      {_id: legacy._id},
      {$set: {isActive: false}}
    );
  }
}

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
