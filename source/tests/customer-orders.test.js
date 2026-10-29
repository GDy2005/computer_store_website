import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerOrderService} from '../services/order-service/src/services/customer-order.service.js';
import {validateOrderListQuery} from '../services/order-service/src/validations/order.validation.js';

function runQuery(query) {
  return new Promise((resolve, reject) => {
    const req = {query};
    validateOrderListQuery(req, {}, error => {
      if (error) reject(error);
      else resolve(req.validatedQuery);
    });
  });
}

function order(overrides = {}) {
  return {
    orderNumber: 'ORD-20261018-ABC123',
    userId: 'user-1',
    status: 'CONFIRMED',
    workflowStatus: 'CONFIRMED',
    customer: {fullName: 'Nguyen Van A', email: 'a@example.com', phone: '0900000000'},
    shippingAddress: {recipientName: 'Nguyen Van A', phone: '0900000000', addressLine: '1 Main', ward: 'Ward 1', district: 'District 1', province: 'HCM'},
    items: [{productId: 'product-1', variantId: 'variant-1', sku: 'SKU-1', productName: 'Keyboard', variantName: 'Black', imageUrl: 'https://example.com/a.jpg', brand: 'Brand', categoryName: 'Keyboard', quantity: 2, unitPrice: 1000000, unitCost: 600000, lineTotal: 2000000}],
    pricing: {subtotal: 2000000, discountAmount: 200000, shippingFee: 50000, total: 1850000, totalCost: 1200000, profit: 600000},
    coupon: {code: 'HELLO', discountAmount: 200000, status: 'APPLIED'},
    payment: {method: 'COD', status: 'PENDING'},
    statusHistory: [
      {status: 'PENDING', updatedAt: new Date('2026-10-18T01:00:00Z'), note: 'Waiting'},
      {status: 'CONFIRMED', updatedAt: new Date('2026-10-18T02:00:00Z'), note: 'Reserved'}
    ],
    cancellationReason: null,
    createdAt: new Date('2026-10-18T01:00:00Z'),
    updatedAt: new Date('2026-10-18T02:00:00Z'),
    ...overrides
  };
}

test('customer order history query validates and bounds pagination', async () => {
  assert.deepEqual(await runQuery({}), {page: 1, limit: 10});
  assert.deepEqual(await runQuery({page: '2', limit: '20'}), {page: 2, limit: 20});
  await assert.rejects(runQuery({limit: '51'}), /Invalid limit/);
  await assert.rejects(runQuery({status: 'CONFIRMED'}), /Unknown query parameters/);
});

test('order history is scoped to user, newest first and paginated', async () => {
  let findFilter;
  let countFilter;
  const chain = {
    sort(value) { assert.deepEqual(value, {createdAt: -1}); return this; },
    skip(value) { assert.equal(value, 10); return this; },
    limit(value) { assert.equal(value, 10); return this; },
    async lean() { return [order()]; }
  };
  const service = createCustomerOrderService({Order: {
    find(filter) { findFilter = filter; return chain; },
    async countDocuments(filter) { countFilter = filter; return 21; }
  }});
  const result = await service.list('user-1', {page: 2, limit: 10});
  assert.deepEqual(findFilter, {userId: 'user-1'});
  assert.deepEqual(countFilter, {userId: 'user-1'});
  assert.deepEqual(result.meta, {page: 2, limit: 10, totalItems: 21, totalPages: 3});
  assert.equal(result.items[0].itemCount, 2);
  assert.equal(result.items[0].pricing.total, 1850000);
  assert.equal(result.items[0].pricing.profit, undefined);
  assert.equal(result.items[0].items, undefined);
});

test('order detail requires matching user and hides internal cost data', async () => {
  let filter;
  const service = createCustomerOrderService({Order: {
    findOne(value) {
      filter = value;
      return {async lean() { return order(); }};
    }
  }});
  const result = await service.detail('user-1', 'ORD-20261018-ABC123');
  assert.deepEqual(filter, {userId: 'user-1', orderNumber: 'ORD-20261018-ABC123'});
  assert.equal(result.items[0].unitCost, undefined);
  assert.equal(result.pricing.totalCost, undefined);
  assert.equal(result.pricing.profit, undefined);
  assert.equal(result.statusHistory[0].status, 'CONFIRMED');
  assert.equal(result.statusHistory[1].status, 'PENDING');
});

test('order detail returns not found for another user order', async () => {
  const service = createCustomerOrderService({Order: {
    findOne() { return {async lean() { return null; }}; }
  }});
  await assert.rejects(
    service.detail('user-2', 'ORD-20261018-ABC123'),
    error => error.status === 404 && error.code === 'NOT_FOUND'
  );
});
