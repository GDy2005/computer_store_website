import {
  enqueueOrderCancelled,
  enqueueOrderConfirmed,
  enqueueInventoryRelease,
  enqueueLoyaltyChanged
} from '../events/order.events.js';

export function createOrderWorkflowService({
  Order,
  Coupon,
  Cart,
  Outbox,
  loyaltyService
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
      _id: event.payload.orderId
    }).session(session);

    if (!order) return;

    // A reservation may arrive after the timeout transaction cancelled the order.
    if (order.workflowStatus === 'REJECTED') {
      await enqueueInventoryRelease({
        Outbox, order, session,
        reservationId: event.payload.reservationId,
        reason: order.cancellationReason || 'Checkout cancelled',
        correlationId: event.correlationId,
        causationId: event.eventId
      });
      return;
    }
    if (order.workflowStatus !== 'AWAITING_INVENTORY') return;

    order.inventoryReservationId =
      event.payload.reservationId;
    order.workflowStatus = 'CONFIRMED';
    order.status = 'CONFIRMED';

    if (order.coupon?.status === 'RESERVED') {
      order.coupon.status = 'APPLIED';
    }

    const redemption = await loyaltyService.commitRedemption(order, session);

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
    if (redemption) {
      await enqueueLoyaltyChanged({
        Outbox,
        order,
        transaction: redemption,
        correlationId: event.correlationId,
        causationId: event.eventId,
        session
      });
    }
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

    const refund = await loyaltyService.refundRedemption(order, session);

    order.workflowStatus = 'REJECTED';
    order.status = 'CANCELLED';
    if (order.payment?.method === 'SIMULATED_ONLINE') {
      order.payment.status = 'FAILED';
    }
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
    if (refund) {
      await enqueueLoyaltyChanged({
        Outbox,
        order,
        transaction: refund,
        correlationId: event.correlationId,
        causationId: event.eventId,
        session
      });
    }
  }

  async function expire(orderId, cutoff, session) {
    const order = await Order.findOne({
      _id: orderId,
      workflowStatus: 'AWAITING_INVENTORY',
      createdAt: {$lte: cutoff}
    }).session(session);

    if (!order) return;

    // Reuse the cancellation path so coupon and order changes share one transaction.
    await rejected({
      correlationId: `checkout-timeout:${orderId}`,
      payload: {orderId, reason: 'Checkout timed out while waiting for inventory'}
    }, session);
  }

  return {reserved, rejected, expire};
}
