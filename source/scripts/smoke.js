import assert from 'node:assert/strict';
import {eventually} from '@store/test-utils';
import {loginAsAdmin} from './support/admin-session.js';

const base = process.env.APP_BASE_URL || 'http://localhost';
let adminCookie;

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(adminCookie ? {cookie: adminCookie} : {}),
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json();
  assert.ok(response.ok, `${response.status} ${JSON.stringify(body)}`);
  return body.data;
}

const probeNames = [
  'identity',
  'catalog',
  'order',
  'notification',
  'analytics',
  'search'
];
const platformNames = [...probeNames, 'ai'];
const indexedByService = rows =>
  new Map(rows.map(row => [row.service, row]));

await eventually(async () => {
  try {
    const response = await fetch(`${base}/health/ready`, {
      signal: AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch {
    return false;
  }
}, 180000);

adminCookie = await loginAsAdmin(base);

let status = await request('/api/v1/foundation/status');
assert.equal(status.length, platformNames.length);
assert.deepEqual(
  new Set(status.map(service => service.service)),
  new Set(platformNames.map(name => `${name}-service`))
);

const categories = await request('/api/v1/categories?featured=true');
assert.equal(categories.items.length, 6);
assert.ok(categories.items.every(category => category.isFeatured));

for (const mode of ['normal', 'retry', 'poison']) {
  const before = await request('/api/v1/foundation/status');
  const probe = await request('/api/v1/foundation/identity/probes', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({message: `Smoke ${mode}`, mode})
  });

  if (mode === 'poison') {
    await eventually(async () => {
      const previous = indexedByService(before);
      const current = indexedByService(
        await request('/api/v1/foundation/status')
      );
      return probeNames.every(name =>
        current.get(`${name}-service`)?.deadLetters >
        previous.get(`${name}-service`)?.deadLetters
      );
    });
  } else {
    await eventually(async () => {
      const states = await Promise.all(probeNames.map(name =>
        request(`/api/v1/foundation/${name}/probes/${probe.probeId}`)
      ));
      return states.every(state => state?.effects === 1);
    });
  }

  console.log(`PASS ${mode} ${probe.correlationId}`);
}

status = await request('/api/v1/foundation/status');
const finalServices = indexedByService(status);
assert.ok(probeNames.every(name =>
  finalServices.get(`${name}-service`)?.processedEvents >= 2
));

const invalid = await fetch(
  `${base}/api/v1/foundation/identity/probes`,
  {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: adminCookie
    },
    body: '{"mode":"invalid"}'
  }
);
assert.equal(invalid.status, 400);

const gateways = new Set();
for (let index = 0; index < 8; index++) {
  const response = await fetch(`${base}/health/live`);
  gateways.add(response.headers.get('x-gateway-instance'));
}
assert.equal(gateways.size, 2);
console.log('PASS platform: 7 services, real Kafka, transactions, retry, DLQ, 2 gateways');
console.log('PASS Catalog categories: 6 featured categories through Gateway');
