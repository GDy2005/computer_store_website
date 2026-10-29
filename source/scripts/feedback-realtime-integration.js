import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {io} from 'socket.io-client';

const baseUrl = process.env.APP_BASE_URL || 'http://feedback-test-gateway:5000';

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

  throw new Error(lastError ? `${message}: ${lastError.message}` : message);
}

async function request(path, {
  method = 'GET', body, cookie, status
} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? {'content-type': 'application/json'} : {}),
      ...(cookie ? {cookie} : {})
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

function waitForSocketEvent(socket, eventName, predicate, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeout);
    function handler(event) {
      if (!predicate(event)) return;
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(event);
    }
    socket.on(eventName, handler);
  });
}

await waitFor(async () => {
  try {
    return (await fetch(`${baseUrl}/health/ready`, {
      signal: AbortSignal.timeout(10000)
    })).ok;
  } catch {
    return false;
  }
}, 'Feedback test Gateway did not become ready', 180000);

const catalog = (await request('/api/v1/products?page=1&limit=1')).data;
const product = catalog.items[0];
assert.ok(product?._id, 'Catalog has no product for feedback test');

const socket = io(baseUrl, {
  path: '/socket.io',
  transports: ['websocket'],
  reconnection: false
});

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Socket.IO connection timed out')),
      15000
    );
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', error => {
      clearTimeout(timer);
      reject(error);
    });
  });

  await new Promise((resolve, reject) => {
    socket.emit('product:join', product._id, result => {
      if (result?.success) resolve();
      else reject(new Error(result?.error || 'Cannot join product room'));
    });
  });

  const marker = randomUUID();
  const expectedContent = `Feedback realtime ${marker}`;
  const commentEventPromise = waitForSocketEvent(
    socket,
    'comment.created',
    event => event.productId === product._id &&
      event.content === expectedContent
  );

  const created = (await request(
    `/api/v1/products/${product._id}/comments`,
    {
      method: 'POST',
      status: 201,
      body: {
        guestName: 'Phase Six Guest',
        guestEmail: `feedback-${marker}@example.invalid`,
        content: `<b>${expectedContent}</b>`
      }
    }
  )).data;
  assert.equal(created.content, expectedContent);
  assert.equal(created.guestEmail, undefined);

  const commentEvent = await commentEventPromise;
  assert.equal(commentEvent.commentId, created._id);
  assert.ok(commentEvent.occurredAt);

  const comments = await request(
    `/api/v1/products/${product._id}/comments?page=1&limit=10`
  );
  const storedComment = comments.data.items.find(
    item => item._id === created._id
  );
  assert.ok(storedComment, 'Created guest comment is missing from REST API');
  assert.equal(storedComment.guestEmail, undefined);

  await request(`/api/v1/products/${product._id}/rating`, {
    method: 'PUT',
    status: 401,
    body: {stars: 5}
  });

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'change-me'
    }
  });
  assert.ok(login.cookie, 'Authenticated session cookie is missing');

  const ratingEventPromise = waitForSocketEvent(
    socket,
    'rating.updated',
    event => event.productId === product._id
  );
  const updated = (await request(
    `/api/v1/products/${product._id}/rating`,
    {
      method: 'PUT',
      cookie: login.cookie,
      body: {stars: 5}
    }
  )).data;
  const ratingEvent = await ratingEventPromise;
  assert.equal(ratingEvent.averageRating, updated.averageRating);
  assert.equal(ratingEvent.ratingCount, updated.ratingCount);

  const summary = (await request(
    `/api/v1/products/${product._id}/ratings`,
    {cookie: login.cookie}
  )).data;
  assert.equal(summary.myRating, 5);
  assert.equal(summary.averageRating, updated.averageRating);
  assert.equal(summary.ratingCount, updated.ratingCount);

  const refreshedProduct = (await request(
    `/api/v1/products/${encodeURIComponent(product.slug)}`
  )).data;
  assert.equal(refreshedProduct.averageRating, updated.averageRating);
  assert.equal(refreshedProduct.ratingCount, updated.ratingCount);

  console.log(
    `PASS feedback: guest comment, authenticated rating, average cache and Socket.IO realtime (${product.slug})`
  );
} finally {
  socket.disconnect();
}
