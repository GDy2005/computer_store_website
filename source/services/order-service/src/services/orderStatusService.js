import {AppError} from '@store/validation';
import {
  enqueueInventoryRelease,
  enqueueLoyaltyChanged,
  enqueueOrderCancelled,
  enqueueOrderStatusChanged
} from '../events/order.events.js';
import {createOrderRepository} from '../repositories/orderRepository.js';
import {createCouponRepository} from '../repositories/couponRepository.js';

const transitions = {
  PENDING: new Set(['CANCELLED']),
  CONFIRMED: new Set(['SHIPPING', 'CANCELLED']),
  SHIPPING: new Set(['DELIVERED']),
  DELIVERED: new Set(),
  CANCELLED: new Set()
};

export function createOrderStatusService({
  connection,
  Order,
  Coupon,
  orderRepository: injectedOrderRepository,
  couponRepository: injectedCouponRepository,
  Outbox,
  loyaltyService
}) {
  const orderRepository = injectedOrderRepository ||
    createOrderRepository({Order});
  const couponRepository = injectedCouponRepository ||
    createCouponRepository({Coupon});

  async function releaseCoupon(order, session) {
    if (!['RESERVED', 'APPLIED'].includes(order.coupon?.status)) return;

    await couponRepository.release(
      order.coupon.couponId,
      session
    );
    order.coupon.status = 'RELEASED';
  }

  async function update({
    orderId,
    status,
    note,
    updatedBy,
    correlationId
  }) {
    return connection.transaction(async session => {
      const order = await orderRepository.findById(
        orderId,
        session
      );
      if (!order) {
        throw new AppError(404, 'NOT_FOUND', 'Order not found');
      }

      const previousStatus = order.status;
      if (!transitions[previousStatus]?.has(status)) {
        throw new AppError(
          409,
          'INVALID_ORDER_TRANSITION',
          `Cannot change order from ${previousStatus} to ${status}`
        );
      }

      order.status = status;
      order.statusHistory.push({status, note, updatedBy});

      let loyaltyTransaction = null;
      if (status === 'DELIVERED') {
        loyaltyTransaction = await loyaltyService.earn(order, session);
      } else if (status === 'CANCELLED') {
        await releaseCoupon(order, session);
        loyaltyTransaction = await loyaltyService.refundRedemption(
          order,
          session
        );
        order.workflowStatus = 'REJECTED';
        order.cancellationReason = note || 'Cancelled by administrator';
        if (order.payment?.method !== 'COD') {
          order.payment.status = 'FAILED';
        }
      }

      await orderRepository.save(order, session);
      await enqueueOrderStatusChanged({
        Outbox,
        order,
        previousStatus,
        correlationId,
        session
      });
      if (status === 'CANCELLED') {
        await enqueueOrderCancelled({
          Outbox,
          order,
          reason: order.cancellationReason,
          correlationId,
          session
        });
        if (order.inventoryReservationId) {
          await enqueueInventoryRelease({
            Outbox,
            order,
            reservationId: order.inventoryReservationId,
            reason: order.cancellationReason,
            correlationId,
            session
          });
        }
      }
      if (loyaltyTransaction) {
        await enqueueLoyaltyChanged({
          Outbox,
          order,
          transaction: loyaltyTransaction,
          correlationId,
          session
        });
      }

      return order;
    });
  }

  return {update};
}
