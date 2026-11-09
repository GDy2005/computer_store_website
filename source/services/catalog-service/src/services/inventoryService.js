import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';

import {
  enqueueInventoryRejected,
  enqueueInventoryReserved
} from '../events/catalog-events.js';
import {
  createProductRepository
} from '../repositories/productRepository.js';
import {
  createInventoryRepository
} from '../repositories/inventoryRepository.js';

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
  productRepository: injectedProductRepository,
  inventoryRepository: injectedInventoryRepository,
  Product,
  InventoryReservation,
  Outbox
}) {
  const productRepository = injectedProductRepository ||
    createProductRepository({Product});
  const inventoryRepository = injectedInventoryRepository ||
    createInventoryRepository({InventoryReservation});
  async function reserve(event, session) {
    const existing =
      await inventoryRepository.findByOrderId(
        event.payload.orderId,
        session
      );

    if (existing) return existing;

    const items = combineItems(event.payload.items);
    const productIds = [
      ...new Set(items.map(item => item.productId))
    ];

    const products = await productRepository.findManyByIds(
      productIds,
      session
    );

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
      const reservation = await inventoryRepository.create(
        {
          reservationId,
          orderId: event.payload.orderId,
          orderNumber: event.payload.orderNumber,
          items,
          status: 'REJECTED',
          reason: rejectionReason
        },
        session
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

    await productRepository.saveMany(products, session);

    const reservation = await inventoryRepository.create(
      {
        reservationId,
        orderId: event.payload.orderId,
        orderNumber: event.payload.orderNumber,
        items,
        status: 'RESERVED'
      },
      session
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
      await inventoryRepository.findByReservation(
        {
          reservationId: event.payload.reservationId,
          orderId: event.payload.orderId
        },
        session
      );

    if (!reservation) {
      throw new Error(
        'Inventory reservation not found'
      );
    }

    if (!['RESERVED', 'COMMITTED'].includes(reservation.status)) {
      return reservation;
    }

    const wasCommitted = reservation.status === 'COMMITTED';

    const productIds = [
      ...new Set(
        reservation.items.map(item =>
          item.productId.toString()
        )
      )
    ];

    const products = await productRepository.findManyByIds(
      productIds,
      session
    );

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

      if (wasCommitted) {
        variant.stock += item.quantity;
      } else {
        variant.reservedStock = Math.max(
          0,
          variant.reservedStock - item.quantity
        );
      }
    }

    await productRepository.saveMany(products, session);

    reservation.status = 'RELEASED';
    reservation.reason = event.payload.reason;

    await inventoryRepository.save(reservation, session);

    return reservation;
  }

  async function commit(event, session) {
    const reservation =
      await inventoryRepository.findByOrderId(
        event.payload.orderId,
        session
      );

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

    const products = await productRepository.findManyByIds(
      productIds,
      session
    );

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

    await productRepository.saveMany(products, session);

    reservation.status = 'COMMITTED';
    await inventoryRepository.save(reservation, session);

    return reservation;
  }

  return {reserve, release, commit};
}
