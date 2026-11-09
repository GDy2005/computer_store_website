import {sendSuccess} from '@store/http-response';
import {AdminOrderRequestDTO} from '../dto/request/AdminOrderRequestDTO.js';

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

        sendSuccess(res, {
          message: 'Admin orders retrieved successfully',
          data: result
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

        sendSuccess(res, {message: 'Admin order retrieved successfully', data});
      } catch (error) {
        next(error);
      }
    },

    async updateOrderStatus(req, res, next) {
      try {
        const input = AdminOrderRequestDTO.fromStatus(req.body);
        const order = await orderStatusService.update({
          orderId: req.params.id,
          status: input.status,
          note: input.note,
          updatedBy: req.context.userId,
          correlationId: req.context.requestId
        });

        sendSuccess(res, {
          message: 'Order status updated successfully',
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

        sendSuccess(res, {
          message: 'Coupons retrieved successfully',
          data: result
        });
      } catch (error) {
        next(error);
      }
    },

    async createCoupon(req, res, next) {
      try {
        const data = await adminCouponService.create({
          input: AdminOrderRequestDTO.fromCoupon(req.body),
          createdBy: req.context.userId
        });

        sendSuccess(res, {
          status: 201,
          message: 'Coupon created successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
