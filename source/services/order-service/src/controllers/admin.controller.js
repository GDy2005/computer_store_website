export function createAdminController({
  adminOrderService,
  adminCouponService,
  orderStatusService
}) {
  return {
    async listOrders(req, res, next) {
      try {
        const result = await adminOrderService.list(
          req.validatedQuery
        );

        res.json({
          success: true,
          data: {items: result.items},
          meta: result.meta
        });
      } catch (error) {
        next(error);
      }
    },

    async orderDetail(req, res, next) {
      try {
        const data = await adminOrderService.detail(
          req.params.id
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async updateOrderStatus(req, res, next) {
      try {
        const order = await orderStatusService.update({
          orderId: req.params.id,
          status: req.body.status,
          note: req.body.note,
          updatedBy: req.context.userId,
          correlationId: req.context.requestId
        });

        res.json({
          success: true,
          data: {
            orderNumber: order.orderNumber,
            status: order.status,
            loyaltyCredited: order.loyaltyCredited,
            pointsEarned:
              order.loyalty?.pointsEarned || 0
          }
        });
      } catch (error) {
        next(error);
      }
    },

    async listCoupons(req, res, next) {
      try {
        const result = await adminCouponService.list(
          req.validatedQuery
        );

        res.json({
          success: true,
          data: {items: result.items},
          meta: result.meta
        });
      } catch (error) {
        next(error);
      }
    },

    async createCoupon(req, res, next) {
      try {
        const data = await adminCouponService.create({
          input: req.body,
          createdBy: req.context.userId
        });

        res.status(201).json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
