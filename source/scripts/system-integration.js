import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';

import {createAdapter} from '@socket.io/redis-adapter';
import {kafkaClient} from '@store/kafka-client';
import {createClient} from 'redis';
import {Server as SocketServer} from 'socket.io';
import {io as createSocketClient} from 'socket.io-client';

const baseUrl = process.env.APP_BASE_URL || 'http://nginx';
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const elasticsearchUrl = process.env.ELASTICSEARCH_URL ||
  'http://elasticsearch:9200';
const productIndex = process.env.ELASTICSEARCH_PRODUCT_INDEX || 'products_v1';

async function eventually(check, message, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(lastError ? `${message}: ${lastError.message}` : message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? {'content-type': 'application/json'} : {}),
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json();

  assert.ok(response.ok, `${response.status} ${JSON.stringify(body)}`);
  return {response, body};
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise(resolve => server.close(resolve));
}

function waitForSocket(socket, event, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);
    function handler(payload) {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }
    socket.on(event, handler);
  });
}

async function verifyRedisAdapter() {
  const httpOne = createServer();
  const httpTwo = createServer();
  const ioOne = new SocketServer(httpOne, {
    serveClient: false,
    transports: ['websocket']
  });
  const ioTwo = new SocketServer(httpTwo, {
    serveClient: false,
    transports: ['websocket']
  });
  const redisClients = Array.from({length: 4}, () =>
    createClient({url: redisUrl})
  );
  const [publisherOne, subscriberOne, publisherTwo, subscriberTwo] =
    redisClients;
  let client;

  try {
    await Promise.all(redisClients.map(redis => redis.connect()));
    ioOne.adapter(createAdapter(publisherOne, subscriberOne));
    ioTwo.adapter(createAdapter(publisherTwo, subscriberTwo));
    ioOne.on('connection', socket => {
      socket.on('system:join', async (room, acknowledge) => {
        await socket.join(room);
        acknowledge({success: true});
      });
    });

    const [portOne] = await Promise.all([
      listen(httpOne),
      listen(httpTwo)
    ]);
    client = createSocketClient(`http://127.0.0.1:${portOne}`, {
      transports: ['websocket'],
      reconnection: false
    });
    await waitForSocket(client, 'connect');
    const room = `system:${randomUUID()}`;
    await new Promise((resolve, reject) => {
      client.emit('system:join', room, result => {
        if (result?.success) resolve();
        else reject(new Error('Cannot join system integration Redis room'));
      });
    });
    const marker = randomUUID();
    const event = waitForSocket(client, 'system:event');
    ioTwo.to(room).emit('system:event', {marker});
    assert.deepEqual(await event, {marker});
  } finally {
    client?.disconnect();
    await Promise.allSettled([
      new Promise(resolve => ioOne.close(resolve)),
      new Promise(resolve => ioTwo.close(resolve))
    ]);
    await Promise.allSettled([
      closeServer(httpOne),
      closeServer(httpTwo)
    ]);
    await Promise.allSettled(redisClients.map(redis =>
      redis.isOpen ? redis.quit() : undefined
    ));
  }
}

await eventually(async () => {
  try {
    return (await fetch(`${baseUrl}/health/ready`, {
      signal: AbortSignal.timeout(10000)
    })).ok;
  } catch {
    return false;
  }
}, 'Nginx/Gateway stack did not become ready', 180000);

const gatewayInstances = new Set();
for (let index = 0; index < 12; index++) {
  const {response} = await request('/health/live', {
    headers: {connection: 'close'}
  });
  gatewayInstances.add(response.headers.get('x-gateway-instance'));
}
assert.deepEqual(gatewayInstances, new Set(['gateway-1', 'gateway-2']));
console.log('PASS Nginx distributed traffic across gateway-1 and gateway-2');

const foundation = (await request('/api/v1/foundation/status')).body.data;
assert.equal(foundation.length, 7);
assert.ok(foundation.some(service => service.service === 'ai-service'));
console.log('PASS seven independently addressable backend services are healthy');

const products = (
  await request('/api/v1/products?page=1&limit=40&sort=name_asc')
).body.data.items;
assert.ok(products.length >= 40);
assert.ok(products.every(product => product.images.length >= 3));
assert.ok(products.every(product => product.variants.length >= 2));
console.log('PASS demo catalog has 40+ products, three images and two variants each');

await eventually(async () => {
  const search = (
    await request('/api/v1/search?search=gaming&page=1&limit=8')
  ).body.data.items;
  return search.length > 0;
}, 'Search index did not return demo products');

const indexCount = await eventually(async () => {
  const response = await fetch(
    `${elasticsearchUrl}/${encodeURIComponent(productIndex)}/_count`,
    {signal: AbortSignal.timeout(10000)}
  );
  if (!response.ok) return false;
  const count = (await response.json()).count;
  return count >= 40 ? count : false;
}, 'Elasticsearch did not index all demo products');
console.log(`PASS Elasticsearch has ${indexCount} indexed products`);

const ai = (
  await request('/api/v1/ai/chat', {
    method: 'POST',
    body: JSON.stringify({message: 'Tư vấn laptop gaming dưới 35 triệu'})
  })
).body.data;
assert.equal(ai.meta.grounded, true);
assert.ok(ai.products.length > 0);
assert.ok(ai.products.every(product =>
  product.productId && product.url === `/products/${encodeURIComponent(product.slug)}`
));
console.log(`PASS AI recommendations are Search-grounded (${ai.meta.strategy})`);

const kafka = kafkaClient('system-consumer-audit');
const admin = kafka.admin();
await admin.connect();
try {
  const groupIds = [
    'notification-email-group',
    'notification-order-group',
    'notification-service-foundation-group'
  ];
  const groups = await eventually(async () => {
    const description = await admin.describeGroups(groupIds);
    return description.groups.every(group => group.members.length >= 2)
      ? description.groups
      : null;
  }, 'Notification consumer groups did not reach two members');

  for (const group of groups) {
    assert.ok(group.members.length >= 2);
  }
  console.log('PASS notification Kafka consumer groups have at least two active members');
} finally {
  await admin.disconnect();
}

await verifyRedisAdapter();
console.log('PASS Socket.IO event crossed two servers through the Redis adapter');
console.log('PASS scaling, seed, Search, AI and realtime system integration');
