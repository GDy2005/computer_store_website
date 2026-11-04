export function createOrderController({
  cartService,
  couponService,
  checkoutService,
  paymentService,
  customerOrderService,
  loyaltyService
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
        const paymentUrl = await paymentService.create(order, {
          ipAddress: req.get('x-forwarded-for') || req.socket.remoteAddress,
          locale: req.body.paymentLocale
        });

        res.status(202).json({
          success: true,
          data: {
            orderNumber: order.orderNumber,
            status: order.status,
            workflowStatus:
              order.workflowStatus,
            payment: {
              method: order.payment.method,
              status: order.payment.status,
              paymentUrl
            }
          }
        });
      } catch (error) {
        next(error);
      }
    },

    async vnpayReturn(req, res, next) {
      try {
        const result = await paymentService.handleVnpay(
          req.query,
          req.context.requestId
        );
        res.redirect(302, paymentService.resultUrl({
          orderNumber: result.order.orderNumber,
          provider: 'VNPAY',
          outcome: result.outcome
        }));
      } catch (error) {
        next(error);
      }
    },

    async vnpayIpn(req, res) {
      try {
        await paymentService.handleVnpay(
          req.query,
          req.context.requestId
        );
        res.json({RspCode: '00', Message: 'Confirm Success'});
      } catch (error) {
        const code = error.code === 'PAYMENT_ORDER_NOT_FOUND'
          ? '01'
          : error.code === 'PAYMENT_AMOUNT_MISMATCH'
            ? '04'
            : '97';
        res.json({RspCode: code, Message: error.message});
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
    }
  };
}
