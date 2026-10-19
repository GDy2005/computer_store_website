import {AppError} from '@store/validation';
import {
  enqueueLoyaltyChanged,
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
  Outbox,
  loyaltyService
}) {
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
      }

      await order.save({session});
      await enqueueOrderStatusChanged({
        Outbox,
        order,
        previousStatus,
        correlationId,
        session
      });
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
