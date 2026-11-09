function withSession(query, session) {
  if (session && typeof query?.session === 'function') {
    return query.session(session);
  }

  return query;
}

export function createOrderRepository({Order}) {
  return {
    findByCheckoutId(checkoutId, session = null) {
      return withSession(Order.findOne({checkoutId}), session);
    },

    async create(input, session) {
      const [order] = await Order.create([input], {session});
      return order;
    },

    findStatus(orderNumber, ownerQuery) {
      return Order.findOne({orderNumber, ...ownerQuery})
        .select(
          'orderNumber status workflowStatus cancellationReason payment createdAt'
        )
        .lean();
    },

    async listForCustomer({userId, page, limit}) {
      const filter = {userId};
      const [items, totalItems] = await Promise.all([
        Order.find(filter)
          .sort({createdAt: -1})
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter)
      ]);
      return {items, totalItems};
    },

    findCustomerDetail(userId, orderNumber) {
      return Order.findOne({userId, orderNumber}).lean();
    },

    async listAdmin({filter, page, limit}) {
      const [items, totalItems] = await Promise.all([
        Order.find(filter)
          .sort({createdAt: -1})
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter)
      ]);
      return {items, totalItems};
    },

    listAppliedCouponOrders(couponIds) {
      if (!couponIds.length) return Promise.resolve([]);

      return Order.find({
        'coupon.couponId': {$in: couponIds},
        'coupon.status': 'APPLIED'
      })
        .select(
          'orderNumber customer.fullName pricing.total coupon.couponId createdAt'
        )
        .sort({createdAt: -1})
        .lean();
    },

    findAdminDetail(orderId) {
      return Order.findById(orderId).lean();
    },

    findById(orderId, session = null) {
      const query = typeof Order.findById === 'function'
        ? Order.findById(orderId)
        : Order.findOne({_id: orderId});
      return withSession(query, session);
    },

    findByIdAndWorkflow(orderId, workflowStatus, session = null) {
      return withSession(
        Order.findOne({_id: orderId, workflowStatus}),
        session
      );
    },

    findExpired(orderId, cutoff, session = null) {
      return withSession(
        Order.findOne({
          _id: orderId,
          workflowStatus: 'AWAITING_INVENTORY',
          createdAt: {$lte: cutoff}
        }),
        session
      );
    },

    findAwaitingInventory(cutoff, limit = 100) {
      return Order.find({
        workflowStatus: 'AWAITING_INVENTORY',
        createdAt: {$lte: cutoff}
      }).select('_id').limit(limit).lean();
    },

    save(order, session) {
      return order.save(session ? {session} : undefined);
    }
  };
}
