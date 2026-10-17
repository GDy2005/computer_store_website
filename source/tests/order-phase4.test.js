import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

import {validateEvent} from '@store/event-contracts';

import {
  validatePlaceOrder
} from '../services/order-service/src/validations/order.validation.js';

import {
  createCouponService
} from '../services/order-service/src/services/coupon.service.js';

import {
  createCheckoutService
} from '../services/order-service/src/services/checkout.service.js';

import {
  createCartService
} from '../services/order-service/src/services/cart.service.js';

import {
  createOrderWorkflowService
} from '../services/order-service/src/services/order-workflow.service.js';

import {
  createOrderWorkflowConsumers
} from '../services/order-service/src/events/order-workflow.consumer.js';

import {
  createInventoryConsumers
} from '../services/catalog-service/src/events/inventory.consumer.js';

function runMiddleware(middleware, body) {
  return new Promise((resolve, reject) => {
    const req = {body};

    middleware(req, {}, error => {
      if (error) reject(error);
      else resolve(req.body);
    });
  });
}

test('each Saga topic uses a distinct Kafka consumer group', () => {
  const orderConsumers = createOrderWorkflowConsumers({
    workflowService: {}
  });
  const catalogConsumers = createInventoryConsumers({
    inventoryService: {}
  });

  const definitions = [
    ...orderConsumers,
    ...catalogConsumers
  ];

  assert.equal(
    new Set(definitions.map(item => item.groupId)).size,
    definitions.length
  );
});

test('place-order validation normalizes checkout input', async () => {
  const checkoutId = randomUUID();
  const body = await runMiddleware(validatePlaceOrder, {
    checkoutId,
    couponCode: ' welcome10 ',
    paymentMethod: 'COD',
    customer: {
      fullName: ' Nguyen Van A ',
      email: ' USER@EXAMPLE.COM ',
      phone: '0900000000'
    },
    shippingAddress: {
      recipientName: ' Nguyen Van A ',
      phone: '0900000000',
      addressLine: '1 Nguyen Hue',
      ward: 'Ben Nghe',
      district: 'Quan 1',
      province: 'TP HCM'
    }
  });

  assert.equal(body.checkoutId, checkoutId);
  assert.equal(body.couponCode, 'WELCOME10');
  assert.equal(body.customer.email, 'user@example.com');
  assert.equal(body.customer.fullName, 'Nguyen Van A');
});

test('place-order validation rejects unknown fields and malformed UUIDs', async () => {
  const valid = {
    checkoutId: randomUUID(),
    customer: {
      fullName: 'User',
      email: 'user@example.com',
      phone: '0900000000'
    },
    shippingAddress: {
      recipientName: 'User',
      phone: '0900000000',
      addressLine: '1 Main Street',
      ward: 'Ward 1',
      district: 'District 1',
      province: 'HCM'
    }
  };

  await assert.rejects(
    runMiddleware(validatePlaceOrder, {
      ...valid,
      checkoutId: '00000000-0000-0000-0000-000000000000'
    }),
    /Invalid checkoutId/
  );

  await assert.rejects(
    runMiddleware(validatePlaceOrder, {
      ...valid,
      adminOverride: true
    }),
    /Unknown fields/
  );
});

test('coupon preview supports percentage caps and open date bounds', async () => {
  let queryFilter;
  const coupon = {
    code: 'WELCOME10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maximumDiscount: 500000,
    minimumOrder: 1000000,
    usageLimit: 100,
    usedCount: 0
  };

  const service = createCouponService({
    Coupon: {
      findOne(filter) {
        queryFilter = filter;
        return {
          async session() {
            return coupon;
          }
        };
      }
    }
  });

  const result = await service.preview('WELCOME10', 8000000);

  assert.equal(result.discountAmount, 500000);
  assert.ok(queryFilter.$and);
  assert.equal(queryFilter.code, 'WELCOME10');
});

test('checkout preview recalculates totals on the server', async () => {
  const checkoutService = createCheckoutService({
    cartService: {
      async get() {
        return {
          items: [{unitCost: 700000, quantity: 2}],
          subtotal: 2000000
        };
      }
    },
    couponService: {
      async preview() {
        return {
          coupon: {code: 'WELCOME10'},
          discountAmount: 200000
        };
      }
    }
  });

  const result = await checkoutService.preview({
    owner: {guestToken: randomUUID()},
    couponCode: 'WELCOME10',
    requestId: 'request-1'
  });

  assert.deepEqual(result.pricing, {
    subtotal: 2000000,
    discountAmount: 200000,
    shippingFee: 50000,
    total: 1850000,
    totalCost: 1400000,
    profit: 400000
  });
});

test('merging two empty carts does not request an empty catalog quote', async () => {
  const guestToken = randomUUID();
  const userCart = {
    _id: {toString: () => 'user-cart'},
    userId: 'user-1',
    guestToken: null,
    items: []
  };
  const guestCart = {
    _id: {toString: () => 'guest-cart'},
    userId: null,
    guestToken,
    items: []
  };
  let quoteCalls = 0;
  let mergedItems;
  let deletedGuestToken;

  const cartService = createCartService({
    connection: {
      transaction(handler) {
        return handler({});
      }
    },
    Cart: {
      async findOne(filter) {
        return Object.hasOwn(filter, 'guestToken')
          ? guestCart
          : userCart;
      },
      async findOneAndUpdate(filter, update) {
        assert.deepEqual(filter, {userId: 'user-1'});
        mergedItems = update.$set.items;
      },
      async deleteOne(filter) {
        deletedGuestToken = filter.guestToken;
      }
    },
    catalogClient: {
      async quote() {
        quoteCalls += 1;
        throw new Error('Empty quote must not be sent');
      }
    }
  });

  const result = await cartService.merge(
    'user-1',
    guestToken,
    'request-1'
  );

  assert.equal(quoteCalls, 0);
  assert.deepEqual(mergedItems, []);
  assert.equal(deletedGuestToken, guestToken);
  assert.deepEqual(result.items, []);
  assert.equal(result.totalItems, 0);
});

test('inventory success confirms order and preserves newer cart quantities', async () => {
  const productId = '507f1f77bcf86cd799439011';
  const variantId = '507f191e810c19729de860ea';
  const order = {
    _id: 'order-1',
    orderNumber: 'ORD-20261016-ABC123',
    userId: 'user-1',
    customer: {
      fullName: 'User',
      email: 'user@example.com',
      phone: '0900000000'
    },
    items: [{
      productId,
      variantId,
      quantity: 2,
      productName: 'Keyboard',
      categoryName: 'Keyboard',
      unitPrice: 1000000,
      unitCost: 700000,
      lineTotal: 2000000
    }],
    pricing: {
      total: 2050000,
      totalCost: 1400000,
      profit: 600000
    },
    coupon: null,
    cartId: 'cart-1',
    workflowStatus: 'AWAITING_INVENTORY',
    status: 'PENDING',
    statusHistory: [],
    async save() {}
  };

  const cart = {
    items: [{
      productId: {toString: () => productId},
      variantId: {toString: () => variantId},
      quantity: 3
    }],
    async save() {}
  };

  let outboxRows;
  const service = createOrderWorkflowService({
    Order: {
      findOne() {
        return {async session() { return order; }};
      }
    },
    Cart: {
      findById() {
        return {async session() { return cart; }};
      }
    },
    Coupon: {},
    Outbox: {
      async create(rows) {
        outboxRows = rows;
      }
    }
  });

  const event = {
    eventId: randomUUID(),
    correlationId: 'checkout-1',
    payload: {
      orderId: 'order-1',
      reservationId: randomUUID()
    }
  };

  await service.reserved(event, {});

  assert.equal(order.workflowStatus, 'CONFIRMED');
  assert.equal(order.status, 'CONFIRMED');
  assert.equal(cart.items[0].quantity, 1);
  assert.equal(outboxRows[0].topic, 'orders.confirmed.v1');
  assert.doesNotThrow(() => validateEvent(
    'orders.confirmed.v1',
    outboxRows[0].payload
  ));
});
