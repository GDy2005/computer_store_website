import {createEvent} from '@store/event-contracts';

async function enqueue({
  Outbox,
  topic,
  order,
  payload,
  correlationId,
  causationId = null,
  key: suppliedKey,
  session
}) {
  const key = suppliedKey || order._id.toString();

  const event = createEvent(topic, {
    producer: 'order-service',
    key,
    correlationId,
    causationId,
    payload
  });

  await Outbox.create(
    [{
      eventId: event.eventId,
      topic,
      key,
      payload: event
    }],
    {session}
  );

  return event;
}

function checkoutPayload(order) {
  return {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    userId: order.userId,
    customer: {
      fullName: order.customer.fullName,
      email: order.customer.email,
      phone: order.customer.phone
    },
    items: order.items.map(item => ({
      productId: item.productId.toString(),
      variantId: item.variantId.toString(),
      quantity: item.quantity,
      productName: item.productName,
      categoryName: item.categoryName,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal
    })),
    pricing: {
      total: order.pricing.total,
      totalCost: order.pricing.totalCost,
      profit: order.pricing.profit
    }
  };
}

export function enqueueOrderCreated(options) {
  return enqueue({
    ...options,
    topic: 'orders.created.v1',
    payload: checkoutPayload(options.order)
  });
}

export function enqueueOrderConfirmed(options) {
  return enqueue({
    ...options,
    topic: 'orders.confirmed.v1',
    payload: checkoutPayload(options.order)
  });
}

export function enqueueOrderCancelled({
  reason,
  ...options
}) {
  return enqueue({
    ...options,
    topic: 'orders.cancelled.v1',
    payload: {
      orderId: options.order._id.toString(),
      orderNumber: options.order.orderNumber,
      reason
    }
  });
}

export function enqueueInventoryRelease({reservationId, reason, ...options}) {
  return enqueue({
    ...options,
    topic: 'inventory.release-requested.v1',
    payload: {
      orderId: options.order._id.toString(),
      reservationId,
      reason
    }
  });
}

export function enqueueOrderStatusChanged({
  previousStatus,
  ...options
}) {
  return enqueue({
    ...options,
    topic: 'orders.status-changed.v1',
    payload: {
      orderId: options.order._id.toString(),
      orderNumber: options.order.orderNumber,
      previousStatus,
      status: options.order.status
    }
  });
}

export function enqueueLoyaltyChanged({transaction, ...options}) {
  return enqueue({
    ...options,
    key: options.order.userId,
    topic: 'loyalty.changed.v1',
    payload: {
      userId: options.order.userId,
      orderId: options.order._id.toString(),
      transactionId: transaction._id.toString(),
      type: transaction.type,
      points: transaction.points,
      balanceAfter: transaction.balanceAfter
    }
  });
}
