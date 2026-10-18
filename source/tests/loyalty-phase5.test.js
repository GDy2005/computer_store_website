import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoyaltyService} from '../services/order-service/src/services/loyalty.service.js';
import {createCheckoutService} from '../services/order-service/src/services/checkout.service.js';
import {validatePlaceOrder, validatePreview} from '../services/order-service/src/validations/order.validation.js';

function runMiddleware(middleware, body) {
  return new Promise((resolve, reject) => {
    const req = {body};
    middleware(req, {}, error => error ? reject(error) : resolve(req.body));
  });
}

function accountQuery(account) {
  return {
    session() { return this; },
    async lean() { return account; }
  };
}

test('loyalty input accepts only bounded non-negative integer points', async () => {
  assert.equal((await runMiddleware(validatePreview, {
    couponCode: null, pointsToRedeem: 25
  })).pointsToRedeem, 25);
  await assert.rejects(
    runMiddleware(validatePreview, {pointsToRedeem: 1.5}),
    /Invalid pointsToRedeem/
  );
  const validOrder = {
    checkoutId: '550e8400-e29b-41d4-a716-446655440000',
    pointsToRedeem: -1,
    customer: {fullName: 'User', email: 'user@example.com', phone: '0900000000'},
    shippingAddress: {recipientName: 'User', phone: '0900000000', addressLine: '1 Main', ward: 'Ward', district: 'District', province: 'HCM'}
  };
  await assert.rejects(runMiddleware(validatePlaceOrder, validOrder), /Invalid pointsToRedeem/);
});

test('loyalty summary returns zero for a new user and paginates ledger', async () => {
  const transaction = {
    _id: {toString: () => 'transaction-1'},
    orderId: {toString: () => 'order-1'},
    type: 'EARN', status: 'COMMITTED', points: 100,
    balanceAfter: 100, description: 'Earned', createdAt: new Date()
  };
  const chain = {
    sort(value) { assert.deepEqual(value, {createdAt: -1}); return this; },
    skip(value) { assert.equal(value, 0); return this; },
    limit(value) { assert.equal(value, 10); return this; },
    async lean() { return [transaction]; }
  };
  const service = createLoyaltyService({
    LoyaltyAccount: {findOne: () => accountQuery(null)},
    LoyaltyTransaction: {
      find: () => chain,
      async countDocuments() { return 1; }
    }
  });
  const result = await service.summary('user-1', {page: 1, limit: 10});
  assert.equal(result.pointsBalance, 0);
  assert.equal(result.transactions[0].id, 'transaction-1');
  assert.equal(result.meta.totalPages, 1);
});

test('redeem preview checks login, balance and order maximum', async () => {
  const service = createLoyaltyService({
    LoyaltyAccount: {findOne: () => accountQuery({pointsBalance: 50})},
    LoyaltyTransaction: {}
  });
  assert.deepEqual(await service.preview('user-1', 20, 100), {
    pointsUsed: 20, pointsDiscount: 20000
  });
  await assert.rejects(service.preview(null, 1, 100), error => error.status === 401);
  await assert.rejects(service.preview('user-1', 51, 100), error => error.code === 'LOYALTY_INSUFFICIENT');
  await assert.rejects(service.preview('user-1', 20, 10), error => error.code === 'LOYALTY_EXCEEDS_ORDER');
});

test('checkout preview applies points after coupon and never trusts frontend totals', async () => {
  const service = createCheckoutService({
    cartService: {async get() {
      return {items: [{unitCost: 600000, quantity: 2}], subtotal: 2000000};
    }},
    couponService: {async preview() {
      return {coupon: {code: 'WELCOME10'}, discountAmount: 200000};
    }},
    loyaltyService: {
      async preview(userId, points, maximum) {
        assert.equal(userId, 'user-1');
        assert.equal(points, 100);
        assert.equal(maximum, 1850);
        return {pointsUsed: 100, pointsDiscount: 100000};
      },
      async balance() { return 250; }
    }
  });
  const result = await service.preview({
    owner: {userId: 'user-1'}, couponCode: 'WELCOME10',
    pointsToRedeem: 100, requestId: 'request-1'
  });
  assert.equal(result.pricing.total, 1750000);
  assert.equal(result.pricing.pointsDiscount, 100000);
  assert.equal(result.loyalty.pointsBalance, 250);
});

test('reserve atomically decrements balance and creates pending ledger entry', async () => {
  let filter;
  let update;
  let created;
  const service = createLoyaltyService({
    LoyaltyAccount: {async findOneAndUpdate(filterValue, updateValue) {
      filter = filterValue;
      update = updateValue;
      return {pointsBalance: 70};
    }},
    LoyaltyTransaction: {async create(rows) { created = rows[0]; return rows; }}
  });
  const order = {_id: 'order-1', orderNumber: 'ORD-20261018-ABC123'};
  await service.reserve({userId: 'user-1', order, points: 30, maximumPoints: 100, session: {}});
  assert.deepEqual(filter, {userId: 'user-1', pointsBalance: {$gte: 30}});
  assert.deepEqual(update, {$inc: {pointsBalance: -30, version: 1}});
  assert.equal(created.status, 'PENDING');
  assert.equal(created.balanceAfter, 70);
});

test('reserve rejects a concurrent checkout when balance has changed', async () => {
  const service = createLoyaltyService({
    LoyaltyAccount: {async findOneAndUpdate() { return null; }},
    LoyaltyTransaction: {async create() { assert.fail('Ledger must not be created'); }}
  });
  await assert.rejects(service.reserve({
    userId: 'user-1', order: {_id: 'order-1'}, points: 30,
    maximumPoints: 100, session: {}
  }), error => error.status === 409 && error.code === 'LOYALTY_BALANCE_CHANGED');
});

test('successful Saga commits a pending redemption once', async () => {
  let updates = 0;
  const order = {
    _id: 'order-1',
    loyalty: {pointsUsed: 30, redeemStatus: 'PENDING'}
  };
  const service = createLoyaltyService({
    LoyaltyAccount: {},
    LoyaltyTransaction: {
      async updateOne(filter, update) {
        assert.deepEqual(filter, {
          orderId: 'order-1', type: 'REDEEM', status: 'PENDING'
        });
        assert.deepEqual(update, {$set: {status: 'COMMITTED'}});
        updates += 1;
      }
    }
  });
  await service.commitRedemption(order, {});
  await service.commitRedemption(order, {});
  assert.equal(order.loyalty.redeemStatus, 'COMMITTED');
  assert.equal(updates, 1);
});

test('failed Saga reverses redeem, restores balance and records one refund', async () => {
  let refundRows;
  const order = {
    _id: 'order-1', orderNumber: 'ORD-20261018-ABC123', userId: 'user-1',
    loyalty: {pointsUsed: 30, redeemStatus: 'PENDING'}
  };
  const service = createLoyaltyService({
    LoyaltyAccount: {async findOneAndUpdate() { return {pointsBalance: 100}; }},
    LoyaltyTransaction: {
      async findOneAndUpdate() { return {status: 'REVERSED'}; },
      async create(rows) { refundRows = rows; return rows; }
    }
  });
  await service.refundRedemption(order, {});
  await service.refundRedemption(order, {});
  assert.equal(order.loyalty.redeemStatus, 'REFUNDED');
  assert.equal(refundRows.length, 1);
  assert.equal(refundRows[0].type, 'REFUND');
  assert.equal(refundRows[0].balanceAfter, 100);
});
