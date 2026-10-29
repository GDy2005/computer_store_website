import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  validateAdminUserBan,
  validateAdminUserList,
  validateAdminUserUpdate
} from '../services/identity-service/src/validations/admin-user.validation.js';
import {
  createAdminUserService
} from '../services/identity-service/src/services/admin-user.service.js';
import {
  validateAdminOrderList,
  validateCreateCoupon
} from '../services/order-service/src/validations/admin.validation.js';
import {
  createAdminOrderService
} from '../services/order-service/src/services/admin-order.service.js';
import {
  createAdminCouponService
} from '../services/order-service/src/services/admin-coupon.service.js';

function validate(middleware, req) {
  let error;
  middleware(req, {}, value => {
    error = value;
  });
  if (error) throw error;
  return req;
}

function orderDocument() {
  return {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: 'ORD-20261023-A1B2C3',
    checkoutId: 'secret-checkout-id',
    cartId: new mongoose.Types.ObjectId(),
    guestToken: 'secret-guest-token',
    userId: new mongoose.Types.ObjectId().toString(),
    customer: {
      fullName: 'Customer',
      email: 'customer@example.com',
      phone: '0900000000'
    },
    shippingAddress: {
      recipientName: 'Customer'
    },
    items: [{
      productId: new mongoose.Types.ObjectId(),
      variantId: new mongoose.Types.ObjectId(),
      sku: 'SKU-1',
      productName: 'Product',
      variantName: 'Variant',
      imageUrl: 'https://example.com/image.jpg',
      brand: 'Brand',
      categoryName: 'Laptop',
      quantity: 2,
      unitPrice: 100,
      unitCost: 60,
      lineTotal: 200
    }],
    pricing: {
      subtotal: 200,
      discountAmount: 0,
      pointsDiscount: 0,
      shippingFee: 0,
      total: 200,
      totalCost: 120,
      profit: 80
    },
    payment: {method: 'COD', status: 'PENDING'},
    coupon: null,
    loyalty: {
      pointsUsed: 0,
      pointsEarned: 0,
      redeemStatus: 'NONE'
    },
    loyaltyCredited: false,
    inventoryReservationId: null,
    status: 'CONFIRMED',
    workflowStatus: 'CONFIRMED',
    cancellationReason: null,
    statusHistory: [],
    createdAt: new Date('2026-10-23T01:00:00.000Z'),
    updatedAt: new Date('2026-10-23T01:01:00.000Z')
  };
}

test('admin management query and mutation validation reject unsafe fields', () => {
  const request = validate(validateAdminUserList, {
    query: {
      page: '2',
      limit: '20',
      search: ' customer ',
      isBanned: 'false',
      accountStatus: 'ACTIVE'
    }
  });

  assert.deepEqual(request.validatedQuery, {
    page: 2,
    limit: 20,
    search: 'customer',
    isBanned: false,
    accountStatus: 'ACTIVE'
  });

  assert.throws(() => validate(validateAdminUserUpdate, {
    body: {role: 'ADMIN'}
  }));
  assert.throws(() => validate(validateAdminUserBan, {
    body: {isBanned: 'true'}
  }));
});

test('admin cannot ban the protected administrator account', async () => {
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    email: 'admin@example.com',
    fullName: 'Administrator',
    phone: null,
    role: 'ADMIN',
    isBanned: false,
    accountStatus: 'ACTIVE'
  };
  const service = createAdminUserService({
    connection: {
      transaction: callback => callback('session')
    },
    User: {
      findById() {
        return {session: async () => admin};
      }
    },
    Outbox: {create: assert.fail}
  });

  await assert.rejects(
    service.setBan({
      userId: admin._id.toString(),
      isBanned: true,
      correlationId: 'request-1'
    }),
    error => error.code === 'ADMIN_ACCOUNT_PROTECTED'
  );
});

test('ban customer changes the account and records an outbox event', async () => {
  const outbox = [];
  const customer = {
    _id: new mongoose.Types.ObjectId(),
    email: 'customer@example.com',
    fullName: 'Customer',
    phone: null,
    role: 'CUSTOMER',
    isBanned: false,
    accountStatus: 'ACTIVE',
    async save() {}
  };
  const service = createAdminUserService({
    connection: {
      transaction: callback => callback('session')
    },
    User: {
      findById() {
        return {session: async () => customer};
      }
    },
    Outbox: {
      async create(rows) {
        outbox.push(...rows);
      }
    }
  });

  const result = await service.setBan({
    userId: customer._id.toString(),
    isBanned: true,
    correlationId: 'request-2'
  });

  assert.equal(result.isBanned, true);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].topic, 'users.updated.v1');
  assert.equal(outbox[0].payload.payload.isBanned, true);
});

test('admin order query normalizes an inclusive date range', () => {
  const request = validate(validateAdminOrderList, {
    query: {
      status: 'DELIVERED',
      startDate: '2026-10-01',
      endDate: '2026-10-23'
    }
  });

  assert.equal(
    request.validatedQuery.startDate.toISOString(),
    '2026-10-01T00:00:00.000Z'
  );
  assert.equal(
    request.validatedQuery.endDate.toISOString(),
    '2026-10-23T23:59:59.999Z'
  );
  assert.equal(request.validatedQuery.limit, 20);
});

test('admin order list filters by date and never exposes guest credentials', async () => {
  const document = orderDocument();
  let receivedFilter;
  const query = {
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async lean() { return [document]; }
  };
  const service = createAdminOrderService({
    Order: {
      find(filter) {
        receivedFilter = filter;
        return query;
      },
      async countDocuments() { return 1; }
    }
  });
  const startDate = new Date('2026-10-01T00:00:00.000Z');
  const endDate = new Date('2026-10-31T23:59:59.999Z');

  const result = await service.list({
    page: 1,
    limit: 20,
    status: 'CONFIRMED',
    startDate,
    endDate
  });

  assert.deepEqual(receivedFilter.createdAt, {
    $gte: startDate,
    $lte: endDate
  });
  assert.equal(result.items[0].pricing.profit, 80);
  assert.equal(result.items[0].guestToken, undefined);
  assert.equal(result.items[0].checkoutId, undefined);
  assert.equal(result.items[0].cartId, undefined);
});

test('coupon creation accepts only five-character codes and ten uses', async () => {
  const request = validate(validateCreateCoupon, {
    body: {
      code: 'a2b5c',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      usageLimit: 10
    }
  });

  assert.deepEqual(request.body, {
    code: 'A2B5C',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    usageLimit: 10
  });

  assert.throws(() => validate(validateCreateCoupon, {
    body: {
      code: 'TOO-LONG',
      discountType: 'FIXED',
      discountValue: 1000,
      usageLimit: 11
    }
  }));

  const service = createAdminCouponService({
    Coupon: {
      async create(value) {
        return {
          _id: new mongoose.Types.ObjectId(),
          ...value,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    }
  });

  const coupon = await service.create({
    input: request.body,
    createdBy: 'admin-1'
  });

  assert.equal(coupon.remainingUses, 10);
  assert.equal(coupon.isUsable, true);
});
