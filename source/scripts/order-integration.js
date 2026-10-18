import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

import {eventually} from '@store/test-utils';

const baseUrl = process.env.APP_BASE_URL || 'http://localhost';
const guestToken = randomUUID();

async function request(
  path,
  {method = 'GET', body, status} = {}
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'x-guest-cart-token': guestToken,
      ...(body ? {'content-type': 'application/json'} : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000)
  });

  const payload = await response.json();

  if (status !== undefined) {
    assert.equal(response.status, status, JSON.stringify(payload));
  } else {
    assert.ok(response.ok, `${response.status} ${JSON.stringify(payload)}`);
  }

  return payload.data;
}

await eventually(async () => {
  try {
    const response = await fetch(`${baseUrl}/health/ready`, {
      signal: AbortSignal.timeout(10000)
    });

    return response.ok;
  } catch {
    return false;
  }
}, 180000);

const catalog = await request(
  '/api/v1/products?page=1&limit=40&sort=price_desc'
);

const candidate = catalog.items
  .flatMap(product => product.variants.map(variant => ({
    product,
    variant
  })))
  .find(({variant}) => variant.availableStock >= 1);

assert.ok(candidate, 'Catalog has no in-stock variant');

const {product, variant} = candidate;

let cart = await request('/api/v1/cart/items', {
  method: 'POST',
  status: 201,
  body: {
    productId: product._id,
    variantId: variant._id,
    quantity: 1
  }
});

assert.equal(cart.items.length, 1);
assert.equal(cart.items[0].unitPrice, variant.price);
assert.equal(cart.subtotal, variant.price);

const coupon = await request('/api/v1/coupons/validate', {
  method: 'POST',
  body: {code: 'welcome10'}
});

assert.equal(coupon.code, 'WELCOME10');
assert.ok(coupon.discountAmount > 0);

const preview = await request('/api/v1/checkout/preview', {
  method: 'POST',
  body: {couponCode: coupon.code}
});

assert.equal(preview.cart.subtotal, cart.subtotal);
assert.equal(
  preview.pricing.total,
  preview.pricing.subtotal -
    preview.pricing.discountAmount +
    preview.pricing.shippingFee
);

const checkoutId = randomUUID();
const email = `phase4-${randomUUID()}@example.invalid`;
const placeInput = {
  checkoutId,
  couponCode: coupon.code,
  paymentMethod: 'COD',
  customer: {
    fullName: 'Phase Four Guest',
    email,
    phone: '0900000000'
  },
  shippingAddress: {
    recipientName: 'Phase Four Guest',
    phone: '0900000000',
    addressLine: '4 Integration Street',
    ward: 'Test Ward',
    district: 'Test District',
    province: 'Test Province'
  }
};

const [placed, duplicate] = await Promise.all(
  [1, 2].map(() => request('/api/v1/checkout/place-order', {
    method: 'POST',
    status: 202,
    body: placeInput
  }))
);

assert.equal(duplicate.orderNumber, placed.orderNumber);

let finalOrder;

await eventually(async () => {
  finalOrder = await request(
    `/api/v1/orders/${placed.orderNumber}/status`
  );

  return ['CONFIRMED', 'REJECTED'].includes(
    finalOrder.workflowStatus
  );
}, 30000);

assert.equal(
  finalOrder.workflowStatus,
  'CONFIRMED',
  finalOrder.cancellationReason || 'Order was rejected'
);

cart = await request('/api/v1/cart');
assert.equal(cart.items.length, 0);

// CONFIRMED is emitted before Catalog commits stock; wait for that consumer too.
await eventually(async () => {
  const updated = await request(`/api/v1/products/${product.slug}`);
  const updatedVariant = updated.variants.find(item => item._id === variant._id);
  return updatedVariant.stock === variant.stock - 1 &&
    updatedVariant.availableStock === variant.availableStock - 1;
}, 30000);

console.log(
  `PASS Phase 4: cart, coupon, guest checkout, idempotency and Kafka inventory Saga (${placed.orderNumber})`
);
