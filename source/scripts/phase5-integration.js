import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';

const baseUrl = process.env.APP_BASE_URL || 'http://nginx';
const guestToken = randomUUID();
const email = `phase5-${randomUUID()}@example.invalid`;
const password = 'Phase5 activation password!';

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
  method = 'GET', body, cookie, guest = false, status
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? {'content-type': 'application/json'} : {}),
      ...(cookie ? {cookie} : {}),
      ...(guest ? {'x-guest-cart-token': guestToken} : {})
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
  return {
    data: payload.data,
    meta: payload.meta,
    cookie: response.headers.get('set-cookie')?.split(';')[0]
  };
}

await waitFor(async () => {
  try {
    return (await fetch(`${baseUrl}/health/ready`, {
      signal: AbortSignal.timeout(10000)
    })).ok;
  } catch {
    return false;
  }
}, 'Phase 5 Gateway and application services did not become ready', 180000);

const identityConnection = await mongoose.createConnection(
  process.env.MONGODB_URI,
  {dbName: 'identity_db'}
).asPromise();
const orderConnection = await mongoose.createConnection(
  process.env.MONGODB_URI,
  {dbName: 'order_db'}
).asPromise();

try {
  const catalog = (await request(
    '/api/v1/products?page=1&limit=40&sort=price_desc'
  )).data;
  const candidate = catalog.items
    .flatMap(product => product.variants.map(variant => ({product, variant})))
    .find(({variant}) => variant.availableStock >= 1);
  assert.ok(candidate, 'Catalog has no in-stock variant');

  await request('/api/v1/cart/items', {
    method: 'POST', guest: true, status: 201,
    body: {
      productId: candidate.product._id,
      variantId: candidate.variant._id,
      quantity: 1
    }
  });
  const placed = (await request('/api/v1/checkout/place-order', {
    method: 'POST', guest: true, status: 202,
    body: {
      checkoutId: randomUUID(),
      couponCode: null,
      paymentMethod: 'COD',
      pointsToRedeem: 0,
      customer: {fullName: 'Phase Five Guest', email, phone: '0900000000'},
      shippingAddress: {
        recipientName: 'Phase Five Guest', phone: '0900000000',
        addressLine: '5 Integration Street', ward: 'Test Ward',
        district: 'Test District', province: 'Test Province'
      }
    }
  })).data;

  await waitFor(async () => {
    const current = (await request(
      `/api/v1/orders/${placed.orderNumber}/status`, {guest: true}
    )).data;
    return current.workflowStatus === 'CONFIRMED';
  }, 'Order Saga did not reach CONFIRMED', 30000);

  const activationEvent = await waitFor(async () => {
    return identityConnection.db.collection('outbox_events').findOne({
      topic: 'email.requested.v1',
      'payload.payload.recipientEmail': email,
      'payload.payload.type': 'ACCOUNT_ACTIVATION'
    }, {sort: {createdAt: -1}});
  }, 'Activation email event was not written to the Identity outbox', 10000);
  const actionUrl = activationEvent.payload.payload.templateData.actionUrl;
  const token = new URL(actionUrl).searchParams.get('token');
  assert.ok(token, 'Activation token is missing');
  const activation = (await request('/api/v1/auth/activate', {
    method: 'POST', body: {token, password}
  })).data;

  const login = await request('/api/v1/auth/login', {
    method: 'POST', body: {email, password}
  });
  assert.ok(login.cookie, 'Customer session cookie is missing');
  const history = await request('/api/v1/orders/me?page=1&limit=10', {
    cookie: login.cookie
  });
  assert.ok(
    history.data.items.some(order => order.orderNumber === placed.orderNumber),
    'Activated guest cannot see the checkout order'
  );

  const order = await orderConnection.db.collection('orders').findOne({
    orderNumber: placed.orderNumber
  });
  assert.equal(order.userId, activation.userId);

  const adminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'change-me'
    }
  });
  assert.ok(adminLogin.cookie, 'Admin session cookie is missing');
  await request(`/api/v1/admin/orders/${order._id}/status`, {
    method: 'PATCH', cookie: adminLogin.cookie,
    body: {status: 'SHIPPING', note: 'Phase 5 integration shipping'}
  });
  const delivered = (await request(
    `/api/v1/admin/orders/${order._id}/status`, {
      method: 'PATCH', cookie: adminLogin.cookie,
      body: {status: 'DELIVERED', note: 'Phase 5 integration delivered'}
    }
  )).data;
  assert.equal(delivered.loyaltyCredited, true);

  const expectedPoints = Math.floor(order.pricing.total * 0.1 / 1000);
  assert.equal(delivered.pointsEarned, expectedPoints);

  const detail = (await request(
    `/api/v1/orders/me/${placed.orderNumber}`,
    {cookie: login.cookie}
  )).data;
  assert.deepEqual(
    detail.statusHistory.slice(0, 4).map(entry => entry.status),
    ['DELIVERED', 'SHIPPING', 'CONFIRMED', 'PENDING']
  );
  assert.ok(
    detail.statusHistory.every((entry, index, historyEntries) =>
      index === 0 ||
      new Date(historyEntries[index - 1].updatedAt) >= new Date(entry.updatedAt)
    ),
    'Status history is not in reverse chronological order'
  );

  await waitFor(async () => {
    const loyalty = (await request('/api/v1/loyalty/me', {
      cookie: login.cookie
    })).data;
    return loyalty.pointsBalance === expectedPoints &&
      loyalty.transactions.some(transaction =>
        transaction.type === 'EARN' && transaction.points === expectedPoints
      );
  }, 'Loyalty balance and EARN ledger were not updated', 10000);

  const events = await orderConnection.db.collection('outbox_events')
    .find({
      key: {$in: [order._id.toString(), activation.userId]},
      topic: {$in: ['orders.status-changed.v1', 'loyalty.changed.v1']}
    })
    .toArray();
  assert.equal(
    events.filter(event => event.topic === 'orders.status-changed.v1').length,
    2
  );
  assert.equal(
    events.filter(event => event.topic === 'loyalty.changed.v1').length,
    expectedPoints > 0 ? 1 : 0
  );

  console.log(
    `PASS Phase 5: guest activation, order ownership, status history and loyalty earn (${placed.orderNumber})`
  );
} finally {
  await Promise.all([
    identityConnection.close(),
    orderConnection.close()
  ]);
}
