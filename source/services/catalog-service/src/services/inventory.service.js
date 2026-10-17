import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';

import {
  enqueueInventoryRejected,
  enqueueInventoryReserved
} from '../events/catalog-events.js';

function invalidEvent(message) {
  const error = new Error(message);
  error.code = 'INVALID_EVENT';
  return error;
}

function combineItems(items) {
  const grouped = new Map();

  for (const item of items) {
    if (
      !mongoose.Types.ObjectId.isValid(item.productId) ||
      !mongoose.Types.ObjectId.isValid(item.variantId)
    ) {
      throw invalidEvent(
        'Inventory item contains an invalid ID'
      );
    }

    const key = `${item.productId}:${item.variantId}`;
    const current = grouped.get(key);

    if (current) {
      current.quantity += item.quantity;
    } else {
      grouped.set(key, {...item});
    }
  }

  return [...grouped.values()];
}

export function createInventoryService({
  Product,
  InventoryReservation,
  Outbox
}) {
  async function reserve(event, session) {
    const existing =
      await InventoryReservation.findOne({
        orderId: event.payload.orderId
      }).session(session);

    if (existing) return existing;

    const items = combineItems(event.payload.items);
    const productIds = [
      ...new Set(items.map(item => item.productId))
    ];

    const products = await Product.find({
      _id: {$in: productIds}
    }).session(session);

    const productMap = new Map(
      products.map(product => [
        product._id.toString(),
        product
      ])
    );

    let rejectionReason = null;

    for (const item of items) {
      const product = productMap.get(item.productId);
      const variant = product?.variants.id(item.variantId);

      if (
        !product ||
        !product.isActive ||
        !variant ||
        !variant.isActive
      ) {
        rejectionReason = 'Product or variant is unavailable';
        break;
      }

      const available =
        variant.stock - variant.reservedStock;

      if (available < item.quantity) {
        rejectionReason = `Insufficient stock for SKU ${variant.sku}`;
        break;
      }
    }

    const reservationId = randomUUID();

    if (rejectionReason) {
      const [reservation] =
        await InventoryReservation.create(
          [
            {
              reservationId,
              orderId: event.payload.orderId,
              orderNumber: event.payload.orderNumber,
              items,
              status: 'REJECTED',
              reason: rejectionReason
            }
          ],
          {session}
        );

      await enqueueInventoryRejected({
        Outbox,
        event,
        reservation,
        session
      });

      return reservation;
    }

    for (const item of items) {
      const product = productMap.get(item.productId);
      const variant = product.variants.id(item.variantId);

      variant.reservedStock += item.quantity;
    }

    await Promise.all(
      products.map(product => product.save({session}))
    );

    const [reservation] =
      await InventoryReservation.create(
        [
          {
            reservationId,
            orderId: event.payload.orderId,
            orderNumber: event.payload.orderNumber,
            items,
            status: 'RESERVED'
          }
        ],
        {session}
      );

    await enqueueInventoryReserved({
      Outbox,
      event,
      reservation,
      session
    });

    return reservation;
  }

  async function release(event, session) {
    const reservation =
      await InventoryReservation.findOne({
        reservationId: event.payload.reservationId,
        orderId: event.payload.orderId
      }).session(session);

    if (!reservation) {
      throw new Error(
        'Inventory reservation not found'
      );
    }

    if (reservation.status !== 'RESERVED') {
      return reservation;
    }

    const productIds = [
      ...new Set(
        reservation.items.map(item =>
          item.productId.toString()
        )
      )
    ];

    const products = await Product.find({
      _id: {$in: productIds}
    }).session(session);

    const productMap = new Map(
      products.map(product => [
        product._id.toString(),
        product
      ])
    );

    for (const item of reservation.items) {
      const product = productMap.get(
        item.productId.toString()
      );

      const variant = product?.variants.id(
        item.variantId
      );

      if (!variant) {
        throw new Error(
          'Reserved product variant no longer exists'
        );
      }

      variant.reservedStock = Math.max(
        0,
        variant.reservedStock - item.quantity
      );
    }

    await Promise.all(
      products.map(product => product.save({session}))
    );

    reservation.status = 'RELEASED';
    reservation.reason = event.payload.reason;

    await reservation.save({session});

    return reservation;
  }

  async function commit(event, session) {
    const reservation =
      await InventoryReservation.findOne({
        orderId: event.payload.orderId
      }).session(session);

    if (
      !reservation ||
      reservation.status === 'COMMITTED'
    ) {
      return reservation;
    }

    if (reservation.status !== 'RESERVED') {
      return reservation;
    }

    const productIds = [
      ...new Set(
        reservation.items.map(item =>
          item.productId.toString()
        )
      )
    ];

    const products = await Product.find({
      _id: {$in: productIds}
    }).session(session);

    const productMap = new Map(
      products.map(product => [
        product._id.toString(),
        product
      ])
    );

    for (const item of reservation.items) {
      const product = productMap.get(
        item.productId.toString()
      );

      const variant = product?.variants.id(
        item.variantId
      );

      if (
        !variant ||
        variant.stock < item.quantity ||
        variant.reservedStock < item.quantity
      ) {
        throw new Error(
          'Reserved inventory is inconsistent'
        );
      }

      variant.stock -= item.quantity;
      variant.reservedStock -= item.quantity;
    }

    await Promise.all(
      products.map(product => product.save({session}))
    );

    reservation.status = 'COMMITTED';
    await reservation.save({session});

    return reservation;
  }

  return {reserve, release, commit};
}
