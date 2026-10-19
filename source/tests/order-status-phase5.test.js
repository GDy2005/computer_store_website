import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateEvent} from '@store/event-contracts';
import {createLoyaltyService} from '../services/order-service/src/services/loyalty.service.js';
import {createOrderStatusService} from '../services/order-service/src/services/order-status.service.js';

function orderFixture(status = 'SHIPPING') {
  return {
    _id: {toString: () => '507f1f77bcf86cd799439011'},
    orderNumber: 'ORD-20261019-ABC123',
    userId: '507f1f77bcf86cd799439012',
    status,
    pricing: {total: 2590000},
    loyalty: {pointsUsed: 0, pointsEarned: 0, redeemStatus: 'NONE'},
    loyaltyCredited: false,
    statusHistory: [],
    async save() {}
  };
}

test('delivered order earns ten percent in points and emits both events', async () => {
  const order = orderFixture();
  const outbox = [];
  const loyaltyService = createLoyaltyService({
    LoyaltyAccount: {
      async findOneAndUpdate(filter, update) {
        assert.deepEqual(filter, {userId: order.userId});
        assert.deepEqual(update, {$inc: {pointsBalance: 259, version: 1}});
        return {pointsBalance: 359};
      }
    },
    LoyaltyTransaction: {
      async create(rows) {
        return [{...rows[0], _id: {toString: () => randomUUID()}}];
      }
    }
  });
  const service = createOrderStatusService({
    connection: {transaction: handler => handler({})},
    Order: {findById: () => ({session: async () => order})},
    Outbox: {async create(rows) { outbox.push(...rows); }},
    loyaltyService
  });

  await service.update({
    orderId: order._id,
    status: 'DELIVERED',
    note: 'Delivered to customer',
    updatedBy: 'admin-1',
    correlationId: 'request-1'
  });

  assert.equal(order.status, 'DELIVERED');
  assert.equal(order.loyaltyCredited, true);
  assert.equal(order.loyalty.pointsEarned, 259);
  assert.deepEqual(order.statusHistory[0], {
    status: 'DELIVERED', note: 'Delivered to customer', updatedBy: 'admin-1'
  });
  assert.deepEqual(outbox.map(row => row.topic), [
    'orders.status-changed.v1', 'loyalty.changed.v1'
  ]);
  for (const row of outbox) validateEvent(row.topic, row.payload);
  assert.equal(outbox[1].key, order.userId);
});

test('shipping transition emits status event without earning points', async () => {
  const order = orderFixture('CONFIRMED');
  const outbox = [];
  const service = createOrderStatusService({
    connection: {transaction: handler => handler({})},
    Order: {findById: () => ({session: async () => order})},
    Outbox: {async create(rows) { outbox.push(...rows); }},
    loyaltyService: {async earn() { assert.fail('Must not earn before delivery'); }}
  });
  await service.update({
    orderId: order._id, status: 'SHIPPING', note: null,
    updatedBy: 'admin-1', correlationId: 'request-2'
  });
  assert.equal(order.status, 'SHIPPING');
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].topic, 'orders.status-changed.v1');
});

test('invalid or repeated status transition cannot credit points twice', async () => {
  const order = orderFixture('DELIVERED');
  const service = createOrderStatusService({
    connection: {transaction: handler => handler({})},
    Order: {findById: () => ({session: async () => order})},
    Outbox: {},
    loyaltyService: {async earn() { assert.fail('Must not earn twice'); }}
  });
  await assert.rejects(service.update({
    orderId: order._id, status: 'DELIVERED', updatedBy: 'admin-1',
    correlationId: 'request-3'
  }), error => error.status === 409 && error.code === 'INVALID_ORDER_TRANSITION');
});

test('zero-value delivered order is marked credited without ledger event', async () => {
  const order = orderFixture();
  order.pricing.total = 9999;
  const service = createLoyaltyService({
    LoyaltyAccount: {}, LoyaltyTransaction: {}
  });
  const transaction = await service.earn(order, {});
  assert.equal(transaction, null);
  assert.equal(order.loyaltyCredited, true);
  assert.equal(order.loyalty.pointsEarned, 0);
});
