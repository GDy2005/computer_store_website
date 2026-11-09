import {AppError} from '@store/validation';
import {createCouponRepository} from '../repositories/couponRepository.js';

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

export function createCouponService({
  Coupon,
  couponRepository: injectedCouponRepository
}) {
  const couponRepository = injectedCouponRepository ||
    createCouponRepository({Coupon});

  async function findValid(code, subtotal, session = null) {
    const now = new Date();

    const coupon = await couponRepository.findAvailable(
      code,
      now,
      session
    );

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

    const updated = await couponRepository.reserve(
      coupon,
      session
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
