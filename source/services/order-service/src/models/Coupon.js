import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9]{5}$/
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    maximumDiscount: {
      type: Number,
      default: null,
      min: 0
    },
    minimumOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    startsAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

couponSchema.index({code: 1}, {unique: true});

export function getCouponModel(connection) {
  return connection.models.Coupon ||
    connection.model('Coupon', couponSchema, 'coupons');
}
