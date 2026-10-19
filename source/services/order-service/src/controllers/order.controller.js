export function createOrderController({
  cartService,
  couponService,
  checkoutService,
  customerOrderService,
  loyaltyService,
  orderStatusService
}) {
  return {
    async getCart(req, res, next) {
      try {
        const data = await cartService.get(
          req.cartOwner,
          req.context.requestId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async addItem(req, res, next) {
      try {
        const data = await cartService.add(
          req.cartOwner,
          req.body,
          req.context.requestId
        );

        res.status(201).json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async updateItem(req, res, next) {
      try {
        const data = await cartService.update(
          req.cartOwner,
          req.params.variantId,
          req.body.quantity,
          req.context.requestId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async removeItem(req, res, next) {
      try {
        const data = await cartService.remove(
          req.cartOwner,
          req.params.variantId,
          req.context.requestId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async clearCart(req, res, next) {
      try {
        const data = await cartService.clear(
          req.cartOwner,
          req.context.requestId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async mergeCart(req, res, next) {
      try {
        const data = await cartService.merge(
          req.context.userId,
          req.get('x-guest-cart-token'),
          req.context.requestId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async validateCoupon(req, res, next) {
      try {
        const cart = await cartService.get(
          req.cartOwner,
          req.context.requestId
        );

        const result = await couponService.preview(
          req.body.code,
          cart.subtotal
        );

        res.json({
          success: true,
          data: {
            code: result.coupon.code,
            discountAmount:
              result.discountAmount
          }
        });
      } catch (error) {
        next(error);
      }
    },

    async preview(req, res, next) {
      try {
        const data = await checkoutService.preview({
          owner: req.cartOwner,
          couponCode: req.body.couponCode,
          pointsToRedeem: req.body.pointsToRedeem,
          requestId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async place(req, res, next) {
      try {
        const order = await checkoutService.place({
          owner: req.cartOwner,
          input: req.body,
          requestId: req.context.requestId
        });

        res.status(202).json({
          success: true,
          data: {
            orderNumber: order.orderNumber,
            status: order.status,
            workflowStatus:
              order.workflowStatus
          }
        });
      } catch (error) {
        next(error);
      }
    },

    async orderStatus(req, res, next) {
      try {
        const data = await checkoutService.status(
          req.params.orderNumber,
          req.cartOwner
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async listMyOrders(req, res, next) {
      try {
        const result = await customerOrderService.list(
          req.context.userId,
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

    async myOrderDetail(req, res, next) {
      try {
        const data = await customerOrderService.detail(
          req.context.userId,
          req.params.orderNumber
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async loyaltySummary(req, res, next) {
      try {
        const result = await loyaltyService.summary(
          req.context.userId,
          req.validatedQuery
        );
        res.json({
          success: true,
          data: {
            pointsBalance: result.pointsBalance,
            transactions: result.transactions
          },
          meta: result.meta
        });
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
            pointsEarned: order.loyalty.pointsEarned
          }
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
