export function createCouponRepository({Coupon}) {
  return {
    findAvailable(code, now, session = null) {
      const query = Coupon.findOne({
        code,
        isActive: true,
        $and: [
          {$or: [{startsAt: null}, {startsAt: {$lte: now}}]},
          {$or: [{expiresAt: null}, {expiresAt: {$gte: now}}]}
        ]
      });
      return typeof query?.session === 'function'
        ? query.session(session)
        : query;
    },

    reserve(coupon, session) {
      return Coupon.findOneAndUpdate(
        {_id: coupon._id, usedCount: coupon.usedCount},
        {$inc: {usedCount: 1}},
        {new: true, session}
      );
    },

    release(couponId, session) {
      return Coupon.updateOne(
        {_id: couponId, usedCount: {$gt: 0}},
        {$inc: {usedCount: -1}},
        {session}
      );
    },

    async list({filter, page, limit}) {
      const [items, totalItems] = await Promise.all([
        Coupon.find(filter)
          .sort({createdAt: -1})
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Coupon.countDocuments(filter)
      ]);
      return {items, totalItems};
    },

    create(input) {
      return Coupon.create(input);
    }
  };
}
