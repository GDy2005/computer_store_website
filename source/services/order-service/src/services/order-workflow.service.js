import {
  enqueueOrderCancelled,
  enqueueOrderConfirmed
} from '../events/order.events.js';

export function createOrderWorkflowService({
  Order,
  Coupon,
  Cart,
  Outbox
}) {
  async function consumePlacedItems(order, session) {
    const cart = await Cart.findById(order.cartId)
      .session(session);

    if (!cart) return;

    const orderedQuantity = new Map(
      order.items.map(item => [
        item.variantId.toString(),
        item.quantity
      ])
    );

    cart.items = cart.items.flatMap(item => {
      const quantity = orderedQuantity.get(
        item.variantId.toString()
      );

      if (!quantity) return [item];

      const remaining = item.quantity - quantity;

      if (remaining <= 0) return [];

      item.quantity = remaining;
      return [item];
    });

    await cart.save({session});
  }

  async function reserved(event, session) {
    const order = await Order.findOne({
      _id: event.payload.orderId,
      workflowStatus: 'AWAITING_INVENTORY'
    }).session(session);

    if (!order) return;

    order.inventoryReservationId =
      event.payload.reservationId;
    order.workflowStatus = 'CONFIRMED';
    order.status = 'CONFIRMED';

    if (order.coupon?.status === 'RESERVED') {
      order.coupon.status = 'APPLIED';
    }

    order.statusHistory.push({
      status: 'CONFIRMED',
      note: 'Inventory reserved'
    });

    await order.save({session});

    await consumePlacedItems(order, session);

    await enqueueOrderConfirmed({
      Outbox,
      order,
      correlationId: event.correlationId,
      causationId: event.eventId,
      session
    });
  }

  async function rejected(event, session) {
    const order = await Order.findOne({
      _id: event.payload.orderId,
      workflowStatus: 'AWAITING_INVENTORY'
    }).session(session);

    if (!order) return;

    if (order.coupon?.status === 'RESERVED') {
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

    order.workflowStatus = 'REJECTED';
    order.status = 'CANCELLED';
    order.cancellationReason =
      event.payload.reason;

    order.statusHistory.push({
      status: 'CANCELLED',
      note: event.payload.reason
    });

    await order.save({session});

    await enqueueOrderCancelled({
      Outbox,
      order,
      reason: event.payload.reason,
      correlationId: event.correlationId,
      causationId: event.eventId,
      session
    });
  }

  return {reserved, rejected};
}
