import {AppError} from '@store/validation';
import {
  enqueueInventoryRelease,
  enqueueLoyaltyChanged,
  enqueueOrderCancelled,
  enqueueOrderStatusChanged
} from '../events/order.events.js';

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
  Outbox,
  loyaltyService
}) {
  async function releaseCoupon(order, session) {
    if (!['RESERVED', 'APPLIED'].includes(order.coupon?.status)) return;

    await Coupon.updateOne(
      {
        _id: order.coupon.couponId,
        usedCount: {$gt: 0}
      },
      {$inc: {usedCount: -1}},
      {session}
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
      const order = await Order.findById(orderId).session(session);
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
        if (order.payment?.method === 'SIMULATED_ONLINE') {
          order.payment.status = 'FAILED';
        }
      }

      await order.save({session});
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
