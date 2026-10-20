import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateEvent} from '@store/event-contracts';
import {createOrderWorkflowService} from '../services/order-service/src/services/order-workflow.service.js';
import {createCheckoutTimeoutWorker} from '../services/order-service/src/services/checkout-timeout.service.js';
import {createCheckoutService} from '../services/order-service/src/services/checkout.service.js';
import {createInventoryService} from '../services/catalog-service/src/services/inventory.service.js';

function workflowFixture() {
  const rows = [];
  let refunds = 0;
  const order = {
    _id: 'order-1', orderNumber: 'ORD-20261018-ABC123',
    workflowStatus: 'AWAITING_INVENTORY', status: 'PENDING',
    createdAt: new Date('2026-10-18T00:00:00Z'),
    coupon: {couponId: 'coupon-1', status: 'RESERVED'},
    payment: {method: 'SIMULATED_ONLINE', status: 'PAID'},
    statusHistory: [], async save() {}
  };
  const service = createOrderWorkflowService({
    Order: {
      findOne(filter) {
        return {async session() {
          if (filter.workflowStatus && order.workflowStatus !== filter.workflowStatus) return null;
          if (filter.createdAt && order.createdAt > filter.createdAt.$lte) return null;
          return order;
        }};
      }
    },
    Coupon: {async updateOne() { refunds++; }},
    loyaltyService: {
      async commitRedemption() {},
      async refundRedemption() {}
    },
    Outbox: {async create(events) { rows.push(...events); }}
  });
  return {service, order, rows, refunds: () => refunds};
}

test('timeout cancels once, refunds coupon and emits a valid cancellation', async () => {
  const {service, order, rows, refunds} = workflowFixture();
  const cutoff = new Date('2026-10-18T00:02:00Z');
  await service.expire(order._id, cutoff, {});
  await service.expire(order._id, cutoff, {});
  assert.equal(order.workflowStatus, 'REJECTED');
  assert.equal(order.coupon.status, 'RELEASED');
  assert.equal(order.payment.status, 'FAILED');
  assert.equal(refunds(), 1);
  assert.equal(rows.length, 1);
  validateEvent(rows[0].topic, rows[0].payload);
});

test('inventory rejection refunds coupon only once', async () => {
  const {service, order, refunds} = workflowFixture();
  const event = {eventId: randomUUID(), correlationId: 'test',
    payload: {orderId: order._id, reason: 'Insufficient stock'}};
  await service.rejected(event, {});
  await service.rejected(event, {});
  assert.equal(refunds(), 1);
  assert.equal(order.cancellationReason, 'Insufficient stock');
});

test('late inventory reservation requests release and cannot confirm a timed-out order', async () => {
  const {service, order, rows} = workflowFixture();
  await service.expire(order._id, new Date('2026-10-18T00:02:00Z'), {});
  const reservationId = randomUUID();
  await service.reserved({eventId: randomUUID(), correlationId: 'late-result',
    payload: {orderId: order._id, reservationId}}, {});
  assert.equal(order.workflowStatus, 'REJECTED');
  assert.equal(rows[1].topic, 'inventory.release-requested.v1');
  assert.equal(rows[1].payload.payload.reservationId, reservationId);
  validateEvent(rows[1].topic, rows[1].payload);
});

test('timeout leaves fresh and confirmed orders unchanged', async () => {
  const {service, order, rows} = workflowFixture();
  await service.expire(order._id, new Date('2026-10-17T23:59:00Z'), {});
  assert.equal(order.workflowStatus, 'AWAITING_INVENTORY');
  order.workflowStatus = 'CONFIRMED';
  await service.expire(order._id, new Date('2026-10-18T00:02:00Z'), {});
  assert.equal(order.workflowStatus, 'CONFIRMED');
  assert.equal(rows.length, 0);
});

test('timeout worker rechecks each candidate inside a transaction', async () => {
  const calls = [];
  const session = {};
  const worker = createCheckoutTimeoutWorker({
    timeoutMs: 120000,
    connection: {transaction: handler => handler(session)},
    Order: {find(filter) {
      assert.equal(filter.workflowStatus, 'AWAITING_INVENTORY');
      return {select: () => ({limit: () => ({lean: async () => [{_id: 'order-1'}]})})};
    }},
    workflowService: {async expire(...args) { calls.push(args); }}
  });
  await worker.sweep(new Date('2026-10-18T00:05:00Z'));
  assert.deepEqual(calls, [['order-1', new Date('2026-10-18T00:03:00Z'), session]]);
});

test('guest retry is bound to the original cart token, even with the same email', async () => {
  const service = createCheckoutService({
    Order: {async findOne() { return {guestToken: 'original', userId: 'user-1'}; }}
  });
  await assert.rejects(service.place({
    owner: {guestToken: 'another'}, input: {checkoutId: randomUUID()}
  }), error => error.status === 403 || error.code === 'FORBIDDEN');
  const result = await service.place({
    owner: {guestToken: 'original'}, input: {checkoutId: randomUUID()}
  });
  assert.equal(result.userId, 'user-1');
});

test('concurrent checkout retry returns the committed order after a unique-key conflict', async () => {
  let reads = 0;
  const existing = {guestToken: 'guest', orderNumber: 'ORD-20261018-ABC123'};
  const service = createCheckoutService({
    Order: {async findOne() { return ++reads === 1 ? null : existing; }},
    identityClient: {async resolveGuest() { return {userId: 'user-1'}; }},
    cartService: {async get() { return {cartId: 'cart', items: [{}]}; }},
    connection: {async transaction() { throw Object.assign(new Error('Duplicate'), {code: 11000}); }}
  });
  const result = await service.place({owner: {guestToken: 'guest'},
    input: {checkoutId: randomUUID(), customer: {}, shippingAddress: {}}});
  assert.equal(result.orderNumber, existing.orderNumber);
});

test('inventory release restores reserved stock once without reducing stock', async () => {
  const variant = {stock: 10, reservedStock: 3};
  const reservation = {status: 'RESERVED', items: [{productId: 'product-1', variantId: 'variant-1', quantity: 3}], async save() {}};
  const service = createInventoryService({
    InventoryReservation: {findOne: () => ({session: async () => reservation})},
    Product: {find: () => ({session: async () => [{_id: 'product-1', variants: {id: () => variant}, async save() {}}]})}
  });
  const event = {payload: {orderId: 'order-1', reservationId: 'reservation-1', reason: 'Timeout'}};
  await service.release(event, {});
  await service.release(event, {});
  assert.equal(variant.stock, 10);
  assert.equal(variant.reservedStock, 0);
  assert.equal(reservation.status, 'RELEASED');
});

test('inventory release restocks committed inventory exactly once', async () => {
  const variant = {stock: 7, reservedStock: 0};
  const reservation = {
    status: 'COMMITTED',
    items: [{productId: 'product-1', variantId: 'variant-1', quantity: 3}],
    async save() {}
  };
  const service = createInventoryService({
    InventoryReservation: {
      findOne: () => ({session: async () => reservation})
    },
    Product: {find: () => ({session: async () => [{
      _id: 'product-1',
      variants: {id: () => variant},
      async save() {}
    }]})}
  });
  const event = {payload: {
    orderId: 'order-1',
    reservationId: 'reservation-1',
    reason: 'Order cancelled'
  }};

  await service.release(event, {});
  await service.release(event, {});

  assert.equal(variant.stock, 10);
  assert.equal(variant.reservedStock, 0);
  assert.equal(reservation.status, 'RELEASED');
});

test('insufficient inventory rejects the whole order without partially reserving items', async () => {
  const productId = '507f1f77bcf86cd799439011';
  const firstId = '507f191e810c19729de860ea';
  const secondId = '507f191e810c19729de860eb';
  const variants = {
    [firstId]: {isActive: true, stock: 10, reservedStock: 0, sku: 'FIRST'},
    [secondId]: {isActive: true, stock: 1, reservedStock: 1, sku: 'SECOND'}
  };
  let reservation;
  let outbox;
  const service = createInventoryService({
    Product: {find: () => ({session: async () => [{
      _id: productId, isActive: true, variants: {id: id => variants[id]},
      async save() { assert.fail('Rejected inventory must not be saved'); }
    }]})},
    InventoryReservation: {
      findOne: () => ({session: async () => null}),
      async create(rows) { [reservation] = rows; return rows; }
    },
    Outbox: {async create(rows) { [outbox] = rows; }}
  });
  await service.reserve({eventId: randomUUID(), correlationId: 'inventory-test',
    payload: {orderId: 'order-1', orderNumber: 'ORD-20261018-ABC123', items: [
      {productId, variantId: firstId, quantity: 2},
      {productId, variantId: secondId, quantity: 1}
    ]}}, {});
  assert.equal(variants[firstId].reservedStock, 0);
  assert.equal(variants[secondId].reservedStock, 1);
  assert.equal(reservation.status, 'REJECTED');
  assert.equal(outbox.topic, 'inventory.rejected.v1');
  validateEvent(outbox.topic, outbox.payload);
});
