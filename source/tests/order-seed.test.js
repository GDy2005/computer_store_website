import assert from 'node:assert/strict';
import test from 'node:test';

import mongoose from 'mongoose';

import {getOrderModel} from '../services/order-service/src/models/order.model.js';
import {
  buildOrder,
  orderEvents
} from '../services/order-service/src/seeds/seed-order-data.js';

const now = new Date('2026-11-08T12:00:00.000Z');
const snapshots = Array.from({length: 5}, (_, index) => ({
  productId: new mongoose.Types.ObjectId().toString(),
  variantId: new mongoose.Types.ObjectId().toString(),
  sku: `DEMO-SKU-${index + 1}`,
  productName: `Catalog Product ${index + 1}`,
  variantName: 'Default variant',
  imageUrl: 'https://example.com/product.webp',
  brand: 'Demo Brand',
  categoryName: `Category ${index + 1}`,
  unitPrice: 2000000 + index * 1000000,
  unitCost: 1500000 + index * 700000
}));

test('demo orders validate against the live model and publish real catalog snapshots', async () => {
  const connection = mongoose.createConnection();
  try {
    const Order = getOrderModel(connection);
    const orders = Array.from(
      {length: 45},
      (_, index) => buildOrder(index, snapshots, now)
    );
    const seenNumbers = new Set();
    const confirmedDays = new Set();
    let cancelled = 0;

    for (const order of orders) {
      await new Order(order).validate();
      assert.ok(order.createdAt <= order.updatedAt);
      assert.ok(order.updatedAt <= now);
      assert.ok(order.pricing.total >= 0);
      assert.ok(!seenNumbers.has(order.orderNumber));
      seenNumbers.add(order.orderNumber);

      const events = orderEvents(order);
      const confirmed = events.find(item =>
        item.topic === 'orders.confirmed.v1'
      );
      assert.ok(confirmed);
      assert.equal(
        confirmed.event.payload.items[0].productId,
        order.items[0].productId.toString()
      );
      assert.equal(
        confirmed.event.payload.pricing.total,
        order.pricing.total
      );
      confirmedDays.add(confirmed.event.occurredAt.slice(0, 10));

      if (order.status === 'CANCELLED') {
        cancelled += 1;
        assert.ok(events.some(item =>
          item.topic === 'orders.cancelled.v1'
        ));
      }
    }

    assert.equal(orders.length, 45);
    assert.equal(cancelled, 3);
    assert.equal(confirmedDays.size, 35);
  } finally {
    await connection.close();
  }
});
