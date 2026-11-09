import {AppError} from '@store/validation';
import {createCouponRepository} from '../repositories/couponRepository.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function couponView(coupon, appliedOrders = []) {
  const remainingUses = Math.max(
    0,
    coupon.usageLimit - coupon.usedCount
  );

  return {
    id: coupon._id.toString(),
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    remainingUses,
    isActive: coupon.isActive,
    isUsable: coupon.isActive && remainingUses > 0,
    appliedOrders: appliedOrders.map(order => ({
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      customerName: order.customer?.fullName || null,
      total: order.pricing?.total || 0,
      createdAt: order.createdAt
    })),
    createdBy: coupon.createdBy?.toString?.() || null,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt
  };
}

export function createAdminCouponService({
  Coupon,
  couponRepository: injectedCouponRepository,
  orderRepository
}) {
  const couponRepository = injectedCouponRepository ||
    createCouponRepository({Coupon});

  async function list({
    page,
    limit,
    search,
    isActive
  }) {
    const filter = {};

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (search) {
      filter.code = new RegExp(
        escapeRegex(search),
        'i'
      );
    }

    const {items: coupons, totalItems} =
      await couponRepository.list({filter, page, limit});

    const appliedOrders = orderRepository
      ? await orderRepository.listAppliedCouponOrders(
          coupons.map(coupon => coupon._id)
        )
      : [];
    const ordersByCoupon = new Map();

    for (const order of appliedOrders) {
      const couponId = order.coupon?.couponId?.toString();
      if (!couponId) continue;
      const entries = ordersByCoupon.get(couponId) || [];
      entries.push(order);
      ordersByCoupon.set(couponId, entries);
    }

    return {
      items: coupons.map(coupon => couponView(
        coupon,
        ordersByCoupon.get(coupon._id.toString()) || []
      )),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / limit)
        )
      }
    };
  }

  async function create({input, createdBy}) {
    try {
      const coupon = await couponRepository.create({
        ...input,
        usedCount: 0,
        createdBy
      });

      return couponView(coupon);
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          409,
          'COUPON_ALREADY_EXISTS',
          'Coupon code already exists'
        );
      }

      throw error;
    }
  }

  return {list, create};
}
