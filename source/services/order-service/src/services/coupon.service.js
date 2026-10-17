import {AppError} from '@store/validation';

function discountAmount(coupon, subtotal) {
  const raw = coupon.discountType === 'PERCENTAGE'
    ? Math.floor(
        subtotal * coupon.discountValue / 100
      )
    : coupon.discountValue;

  return Math.min(
    subtotal,
    coupon.maximumDiscount === null
      ? raw
      : Math.min(raw, coupon.maximumDiscount)
  );
}

export function createCouponService({Coupon}) {
  async function findValid(code, subtotal, session = null) {
    const now = new Date();

    const coupon = await Coupon.findOne({
      code,
      isActive: true,
      $and: [
        {
          $or: [
            {startsAt: null},
            {startsAt: {$lte: now}}
          ]
        },
        {
          $or: [
            {expiresAt: null},
            {expiresAt: {$gte: now}}
          ]
        }
      ]
    }).session(session);

    if (
      !coupon ||
      coupon.usedCount >= coupon.usageLimit
    ) {
      throw new AppError(
        400,
        'COUPON_INVALID',
        'Coupon is invalid or has expired'
      );
    }

    if (subtotal < coupon.minimumOrder) {
      throw new AppError(
        400,
        'COUPON_MINIMUM_NOT_MET',
        `Minimum order is ${coupon.minimumOrder}`
      );
    }

    return coupon;
  }

  async function preview(code, subtotal) {
    if (!code) {
      return {
        coupon: null,
        discountAmount: 0
      };
    }

    const coupon = await findValid(code, subtotal);

    return {
      coupon,
      discountAmount:
        discountAmount(coupon, subtotal)
    };
  }

  async function reserve(code, subtotal, session) {
    if (!code) {
      return {
        coupon: null,
        discountAmount: 0
      };
    }

    const coupon =
      await findValid(code, subtotal, session);

    const updated = await Coupon.findOneAndUpdate(
      {
        _id: coupon._id,
        usedCount: coupon.usedCount
      },
      {$inc: {usedCount: 1}},
      {new: true, session}
    );

    if (!updated) {
      throw new AppError(
        409,
        'COUPON_CONFLICT',
        'Coupon was used by another checkout'
      );
    }

    return {
      coupon: updated,
      discountAmount:
        discountAmount(updated, subtotal)
    };
  }

  return {preview, reserve};
}
