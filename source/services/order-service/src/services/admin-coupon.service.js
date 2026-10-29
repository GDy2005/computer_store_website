import {AppError} from '@store/validation';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function couponView(coupon) {
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
    createdBy: coupon.createdBy?.toString?.() || null,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt
  };
}

export function createAdminCouponService({Coupon}) {
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

    const [coupons, totalItems] = await Promise.all([
      Coupon.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter)
    ]);

    return {
      items: coupons.map(couponView),
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
      const coupon = await Coupon.create({
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
