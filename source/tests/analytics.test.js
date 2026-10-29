import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvent} from '@store/event-contracts';

import {createAnalyticsConsumers} from '../services/analytics-service/src/events/analytics.consumer.js';
import {requireAdmin} from '../services/analytics-service/src/middlewares/require-admin.js';
import {
  allocateOrderItems,
  createAnalyticsProjector
} from '../services/analytics-service/src/projections/analytics.projector.js';
import {
  dateKey,
  resolveDashboardRange
} from '../services/analytics-service/src/projections/date-buckets.js';
import {buildDefaultAnalyticsFixtures} from '../services/analytics-service/src/scripts/default-fixtures.js';
import {validateDashboardQuery} from '../services/analytics-service/src/validations/dashboard.validation.js';

function query(value) {
  return {
    async session() { return value; }
  };
}

function memoryProjectionModels() {
  const orders = new Map();
  const daily = new Map();
  const monthly = new Map();
  const sales = new Map();

  class Document {
    constructor(value) { Object.assign(this, value); }
    async save() { return this; }
  }

  function counterModel(store, keyName) {
    return {
      async updateOne(filter, update) {
        const key = filter[keyName];
        const row = store.get(key) || {[keyName]: key};
        Object.assign(row, update.$set || {});
        for (const [field, value] of Object.entries(update.$inc || {})) {
          row[field] = (row[field] || 0) + value;
        }
        store.set(key, row);
      }
    };
  }

  const OrderProjection = {
    findOne({orderId}) { return query(orders.get(orderId) || null); },
    async create([value]) {
      const document = new Document({
        counted: false,
        cancelled: false,
        items: [],
        lastStatusAt: null,
        ...value
      });
      orders.set(value.orderId, document);
      return [document];
    }
  };

  return {
    state: {orders, daily, monthly, sales},
    models: {
      DashboardDaily: counterModel(daily, 'date'),
      DashboardMonthly: counterModel(monthly, 'month'),
      ProductSales: {
        async updateOne(filter, update) {
          const key = `${filter.date}:${filter.productId}`;
          const row = sales.get(key) || {...filter};
          Object.assign(row, update.$set || {});
          for (const [field, value] of Object.entries(update.$inc || {})) {
            row[field] = (row[field] || 0) + value;
          }
          sales.set(key, row);
        }
      },
      OrderProjection,
      UserProjection: counterModel(new Map(), 'userId'),
      ProductProjection: counterModel(new Map(), 'productId')
    }
  };
}

function confirmedEvent(orderId = 'order-1') {
  return {
    occurredAt: '2026-10-20T03:00:00.000Z',
    payload: {
      orderId,
      orderNumber: 'ORD-20261020-ABC123',
      items: [
        {
          productId: 'product-1',
          productName: 'Laptop',
          categoryName: 'Laptop',
          quantity: 1,
          lineTotal: 8000
        },
        {
          productId: 'product-2',
          productName: 'Keyboard',
          categoryName: 'Keyboard',
          quantity: 2,
          lineTotal: 2000
        }
      ],
      pricing: {total: 9000, profit: 1701}
    }
  };
}

test('analytics dashboard periods use Vietnam calendar boundaries', () => {
  const now = new Date('2026-10-23T03:00:00.000Z');
  assert.equal(dateKey(now), '2026-10-23');
  assert.deepEqual(resolveDashboardRange({period: 'week'}, now), {
    period: 'week',
    startDate: '2026-10-19',
    endDate: '2026-10-25'
  });
  assert.deepEqual(resolveDashboardRange({period: 'quarter'}, now), {
    period: 'quarter',
    startDate: '2026-10-01',
    endDate: '2026-12-31'
  });
  assert.throws(
    () => resolveDashboardRange({period: 'custom', startDate: '2026-02-30', endDate: '2026-03-01'}),
    RangeError
  );
});

test('net order revenue and profit allocations preserve exact totals', () => {
  const payload = confirmedEvent().payload;
  const items = allocateOrderItems(payload);
  assert.equal(items.reduce((sum, item) => sum + item.revenue, 0), 9000);
  assert.equal(items.reduce((sum, item) => sum + item.profit, 0), 1701);
  assert.equal(items.reduce((sum, item) => sum + item.quantity, 0), 3);
});

test('confirmed order is counted once and cancellation reverses its original day', async () => {
  const memory = memoryProjectionModels();
  const projector = createAnalyticsProjector(memory.models);
  const confirmed = confirmedEvent();

  await projector.orderConfirmed(confirmed, {});
  await projector.orderConfirmed(confirmed, {});
  assert.deepEqual(memory.state.daily.get('2026-10-20'), {
    date: '2026-10-20',
    orderCount: 1,
    revenue: 9000,
    profit: 1701,
    productsSold: 3
  });

  await projector.orderCancelled({
    occurredAt: '2026-10-23T03:00:00.000Z',
    payload: {orderId: 'order-1', orderNumber: 'ORD-20261020-ABC123'}
  }, {});
  assert.equal(memory.state.daily.get('2026-10-20').orderCount, 0);
  assert.equal(memory.state.daily.get('2026-10-20').revenue, 0);
  assert.equal(memory.state.sales.get('2026-10-20:product-1').quantity, 0);
});

test('cancellation tombstone prevents a later cross-topic confirmation', async () => {
  const memory = memoryProjectionModels();
  const projector = createAnalyticsProjector(memory.models);
  await projector.orderCancelled({
    occurredAt: '2026-10-23T03:00:00.000Z',
    payload: {orderId: 'order-late', orderNumber: 'ORD-20261020-ABC124'}
  }, {});
  await projector.orderConfirmed(confirmedEvent('order-late'), {});
  assert.equal(memory.state.orders.get('order-late').cancelled, true);
  assert.equal(memory.state.orders.get('order-late').counted, false);
  assert.equal(memory.state.daily.size, 0);
});

test('analytics consumers cover every dashboard source topic', () => {
  const noOp = async () => {};
  const consumers = createAnalyticsConsumers({
    projector: {
      userCreated: noOp,
      userUpdated: noOp,
      productChanged: noOp,
      ratingUpdated: noOp,
      orderConfirmed: noOp,
      orderCancelled: noOp,
      orderStatusChanged: noOp
    }
  });
  assert.deepEqual(consumers.map(item => item.topic), [
    'users.created.v1',
    'users.updated.v1',
    'products.created.v1',
    'products.updated.v1',
    'ratings.updated.v1',
    'orders.confirmed.v1',
    'orders.cancelled.v1',
    'orders.status-changed.v1'
  ]);
});

test('dashboard validation rejects malformed ranges and accepts a custom range', () => {
  let accepted;
  validateDashboardQuery({
    query: {
      period: 'custom',
      startDate: '2026-10-01',
      endDate: '2026-10-23'
    }
  }, {}, error => { accepted = error; });
  assert.equal(accepted, undefined);

  let rejected;
  validateDashboardQuery({
    query: {period: 'custom', startDate: '2026-10-01'}
  }, {}, error => { rejected = error; });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.code, 'VALIDATION_ERROR');
});

test('dashboard authorization distinguishes unauthenticated and non-admin users', () => {
  let error;
  requireAdmin({context: {}}, {}, value => { error = value; });
  assert.equal(error.status, 401);
  requireAdmin({context: {userId: 'u1', role: 'CUSTOMER'}}, {}, value => {
    error = value;
  });
  assert.equal(error.status, 403);
  requireAdmin({context: {userId: 'a1', role: 'ADMIN'}}, {}, value => {
    error = value;
  });
  assert.equal(error, undefined);
});

test('default rebuild fixtures obey versioned event contracts', () => {
  const fixtures = buildDefaultAnalyticsFixtures(
    new Date('2026-10-23T03:00:00.000Z')
  );
  assert.ok(fixtures.length >= 6);
  for (const fixture of fixtures) {
    assert.doesNotThrow(() => validateEvent(fixture.topic, fixture.event));
  }
});
