import {sendSuccess} from '@store/http-response';
import {CartRequestDTO} from '../dto/request/CartRequestDTO.js';
import {CheckoutRequestDTO} from '../dto/request/CheckoutRequestDTO.js';

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

        sendSuccess(res, {message: 'Cart retrieved successfully', data});
      } catch (error) {
        next(error);
      }
    },

    async addItem(req, res, next) {
      try {
        const data = await cartService.add(
          req.cartOwner,
          CartRequestDTO.fromItem(req.body),
          req.context.requestId
        );

        sendSuccess(res, {
          status: 201,
          message: 'Cart item added successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async updateItem(req, res, next) {
      try {
        const input = CartRequestDTO.fromQuantity(req.body);
        const data = await cartService.update(
          req.cartOwner,
          req.params.variantId,
          input.quantity,
          req.context.requestId
        );

        sendSuccess(res, {message: 'Cart item updated successfully', data});
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

        sendSuccess(res, {message: 'Cart item removed successfully', data});
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

        sendSuccess(res, {message: 'Cart cleared successfully', data});
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

        sendSuccess(res, {message: 'Guest cart merged successfully', data});
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

        sendSuccess(res, {
          message: 'Coupon validated successfully',
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
        const input = CheckoutRequestDTO.fromPreview(req.body);
        const data = await checkoutService.preview({
          owner: req.cartOwner,
          couponCode: input.couponCode,
          pointsToRedeem: input.pointsToRedeem,
          requestId: req.context.requestId
        });

        sendSuccess(res, {message: 'Checkout preview created successfully', data});
      } catch (error) {
        next(error);
      }
    },

    async place(req, res, next) {
      try {
        const checkout = CheckoutRequestDTO.fromPlace(req.body);
        const {paymentCard, ...checkoutInput} = checkout;
        const payment = paymentService.authorize({
          method: checkoutInput.paymentMethod,
          card: paymentCard
        });

        const order = await checkoutService.place({
          owner: req.cartOwner,
          input: {
            ...checkoutInput,
            payment
          },
          requestId: req.context.requestId
        });

        sendSuccess(res, {
          status: 202,
          message: 'Order accepted for processing',
          data: {
            orderNumber: order.orderNumber,
            status: order.status,
            workflowStatus:
              order.workflowStatus,
            payment: {
              method: order.payment.method,
              status: order.payment.status
            }
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

        sendSuccess(res, {message: 'Order status retrieved successfully', data});
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

        sendSuccess(res, {
          message: 'Orders retrieved successfully',
          data: result
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

        sendSuccess(res, {message: 'Order retrieved successfully', data});
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
        sendSuccess(res, {
          message: 'Loyalty summary retrieved successfully',
          data: result
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
