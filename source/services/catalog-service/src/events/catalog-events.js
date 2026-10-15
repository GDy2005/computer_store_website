import {createEvent} from '@store/event-contracts';

const producer = 'catalog-service';

async function enqueue({
  Outbox,
  topic,
  key,
  payload,
  correlationId,
  causationId = null,
  session
}) {
  const event = createEvent(topic, {
    producer,
    key,
    payload,
    correlationId,
    causationId
  });

  await Outbox.create(
    [
      {
        eventId: event.eventId,
        topic,
        key,
        payload: event
      }
    ],
    {session}
  );

  return event;
}

function productPayload(product) {
  return {
    productId: product._id.toString(),
    slug: product.slug,
    name: product.name,
    description: product.description,
    brand: product.brand,
    categoryId: product.categoryId.toString(),
    tags: [...product.tags],
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    averageRating: product.averageRating,
    isActive: product.isActive
  };
}

export function enqueueProductCreated({
  Outbox,
  product,
  correlationId,
  session
}) {
  return enqueue({
    Outbox,
    topic: 'products.created.v1',
    key: product._id.toString(),
    payload: productPayload(product),
    correlationId,
    session
  });
}

export function enqueueProductUpdated({
  Outbox,
  product,
  correlationId,
  session
}) {
  return enqueue({
    Outbox,
    topic: 'products.updated.v1',
    key: product._id.toString(),
    payload: productPayload(product),
    correlationId,
    session
  });
}

export function enqueueCommentCreated({
  Outbox,
  comment,
  correlationId,
  session
}) {
  return enqueue({
    Outbox,
    topic: 'comments.created.v1',
    key: comment.productId.toString(),
    payload: {
      commentId: comment._id.toString(),
      productId: comment.productId.toString(),
      displayName: comment.displayName,
      content: comment.content
    },
    correlationId,
    session
  });
}

export function enqueueRatingUpdated({
  Outbox,
  product,
  correlationId,
  session
}) {
  return enqueue({
    Outbox,
    topic: 'ratings.updated.v1',
    key: product._id.toString(),
    payload: {
      productId: product._id.toString(),
      averageRating: product.averageRating,
      ratingCount: product.ratingCount
    },
    correlationId,
    session
  });
}

export function enqueueInventoryReserved({
  Outbox,
  event,
  reservation,
  session
}) {
  return enqueue({
    Outbox,
    topic: 'inventory.reserved.v1',
    key: reservation.orderId,
    correlationId: event.correlationId,
    causationId: event.eventId,
    session,
    payload: {
      orderId: reservation.orderId,
      reservationId: reservation.reservationId,
      items: reservation.items.map(item => ({
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        quantity: item.quantity
      }))
    }
  });
}

export function enqueueInventoryRejected({
  Outbox,
  event,
  reservation,
  session
}) {
  return enqueue({
    Outbox,
    topic: 'inventory.rejected.v1',
    key: reservation.orderId,
    correlationId: event.correlationId,
    causationId: event.eventId,
    session,
    payload: {
      orderId: reservation.orderId,
      reason: reservation.reason,
      items: reservation.items.map(item => ({
        productId: item.productId.toString(),
        variantId: item.variantId.toString(),
        quantity: item.quantity
      }))
    }
  });
}
