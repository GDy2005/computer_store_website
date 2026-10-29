import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const baseUrl = process.env.APP_BASE_URL || 'http://localhost';
const guestToken = randomUUID();

async function waitFor(check, message, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(
    lastError ? `${message}: ${lastError.message}` : message
  );
}

async function request(path, {
  method = 'GET',
  body,
  cookie,
  guest = false,
  headers = {},
  status
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? {'content-type': 'application/json'} : {}),
      ...(cookie ? {cookie} : {}),
      ...(guest ? {'x-guest-cart-token': guestToken} : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json();

  if (status !== undefined) {
    assert.equal(response.status, status, JSON.stringify(payload));
  } else {
    assert.ok(
      response.ok,
      `${response.status} ${JSON.stringify(payload)}`
    );
  }

  return {
    data: payload.data,
    meta: payload.meta,
    cookie: response.headers.get('set-cookie')?.split(';')[0]
  };
}

function dateKey(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

await waitFor(async () => {
  try {
    const response = await fetch(`${baseUrl}/health/ready`, {
      signal: AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch {
    return false;
  }
}, 'Admin and analytics services did not become ready', 180000);

await request('/api/v1/admin/dashboard/summary', {status: 401});
await request('/api/v1/admin/users', {
  status: 401,
  headers: {'x-user-role': 'ADMIN', 'x-user-id': 'forged-admin'}
});

const login = await request('/api/v1/auth/login', {
  method: 'POST',
  body: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_INITIAL_PASSWORD || 'change-me'
  }
});
assert.ok(login.cookie, 'Admin session cookie is missing');

const cookie = login.cookie;
const summaryBefore = (
  await request('/api/v1/admin/dashboard/summary', {cookie})
).data;
assert.equal(typeof summaryBefore.totalOrders, 'number');

for (const period of ['week', 'month', 'quarter', 'year']) {
  const analytics = (
    await request(
      `/api/v1/admin/dashboard/analytics?period=${period}`,
      {cookie}
    )
  ).data;
  assert.equal(analytics.period, period);
  assert.ok(Array.isArray(analytics.series));
}

const custom = (
  await request(
    `/api/v1/admin/dashboard/analytics?period=custom&startDate=${dateKey(-1)}&endDate=${dateKey(1)}`,
    {cookie}
  )
).data;
assert.equal(custom.period, 'custom');
assert.ok(custom.series.length >= 3);

const categories = (
  await request('/api/v1/admin/categories', {cookie})
).data.items;
assert.ok(categories.length >= 5, 'Admin category list is incomplete');

const adminProducts = await request(
  '/api/v1/admin/products?page=1&limit=20',
  {cookie}
);
assert.ok(adminProducts.data.items.length > 0);
assert.equal(adminProducts.meta.page, 1);

const publicProducts = (
  await request('/api/v1/products?page=1&limit=40')
).data.items;
const candidate = publicProducts
  .flatMap(product =>
    product.variants.map(variant => ({product, variant}))
  )
  .find(({variant}) => variant.availableStock >= 1);
assert.ok(candidate, 'Catalog has no in-stock variant for admin test');

await request('/api/v1/cart/items', {
  method: 'POST',
  guest: true,
  status: 201,
  body: {
    productId: candidate.product._id,
    variantId: candidate.variant._id,
    quantity: 1
  }
});

const marker = randomUUID();
const customerEmail = `admin-analytics-${marker}@example.invalid`;
const placed = (
  await request('/api/v1/checkout/place-order', {
    method: 'POST',
    guest: true,
    status: 202,
    body: {
      checkoutId: randomUUID(),
      couponCode: null,
      paymentMethod: 'COD',
      pointsToRedeem: 0,
      customer: {
        fullName: 'Phase Seven Customer',
        email: customerEmail,
        phone: '0900000007'
      },
      shippingAddress: {
        recipientName: 'Phase Seven Customer',
        phone: '0900000007',
        addressLine: '7 Integration Street',
        ward: 'Test Ward',
        district: 'Test District',
        province: 'Test Province'
      }
    }
  })
).data;

await waitFor(async () => {
  const status = (
    await request(
      `/api/v1/orders/${placed.orderNumber}/status`,
      {guest: true}
    )
  ).data;
  return status.workflowStatus === 'CONFIRMED';
}, 'Admin test order did not reach CONFIRMED', 30000);

const projectedSummary = await waitFor(async () => {
  const current = (
    await request('/api/v1/admin/dashboard/summary', {cookie})
  ).data;
  return current.totalOrders >= summaryBefore.totalOrders + 1
    ? current
    : null;
}, 'Analytics did not project the confirmed order', 30000);

const orderList = await request(
  `/api/v1/admin/orders?search=${encodeURIComponent(placed.orderNumber)}&page=1&limit=20&startDate=${dateKey(-1)}&endDate=${dateKey(1)}`,
  {cookie}
);
const listedOrder = orderList.data.items.find(
  order => order.orderNumber === placed.orderNumber
);
assert.ok(listedOrder, 'New order is missing from admin order list');

const orderId = listedOrder.id || listedOrder._id;
const orderDetail = (
  await request(`/api/v1/admin/orders/${orderId}`, {cookie})
).data;
assert.equal(orderDetail.orderNumber, placed.orderNumber);
assert.equal(orderDetail.guestToken, undefined);
assert.equal(orderDetail.checkoutId, undefined);
assert.equal(orderDetail.cartId, undefined);

const users = await request(
  `/api/v1/admin/users?search=${encodeURIComponent(customerEmail)}&page=1&limit=20`,
  {cookie}
);
const customer = users.data.items.find(user => user.email === customerEmail);
assert.ok(customer, 'Checkout customer is missing from admin user list');
const customerId = customer.id || customer._id;

const banned = (
  await request(`/api/v1/admin/users/${customerId}/ban`, {
    method: 'PATCH',
    cookie,
    body: {isBanned: true}
  })
).data;
assert.equal(banned.isBanned, true);

const unbanned = (
  await request(`/api/v1/admin/users/${customerId}/ban`, {
    method: 'PATCH',
    cookie,
    body: {isBanned: false}
  })
).data;
assert.equal(unbanned.isBanned, false);

const couponCode = randomUUID().replaceAll('-', '').slice(0, 5).toUpperCase();
const coupon = (
  await request('/api/v1/admin/coupons', {
    method: 'POST',
    cookie,
    status: 201,
    body: {
      code: couponCode,
      discountType: 'FIXED',
      discountValue: 10000,
      usageLimit: 3
    }
  })
).data;
assert.equal(coupon.code, couponCode);
assert.equal(coupon.remainingUses, 3);

const coupons = await request(
  `/api/v1/admin/coupons?search=${couponCode}&page=1&limit=20`,
  {cookie}
);
assert.ok(coupons.data.items.some(item => item.code === couponCode));

await request(`/api/v1/admin/orders/${orderId}/status`, {
  method: 'PATCH',
  cookie,
  body: {
    status: 'CANCELLED',
    note: 'Admin integration rollback'
  }
});

await waitFor(async () => {
  const current = (
    await request('/api/v1/admin/dashboard/summary', {cookie})
  ).data;
  return current.totalOrders < projectedSummary.totalOrders;
}, 'Analytics did not reverse the cancelled order', 30000);

console.log(
  `PASS admin and analytics: authorization/CRUD, order filters, coupon usage and projections (${placed.orderNumber})`
);

