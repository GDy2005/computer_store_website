import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

test('production-style deployment scales every backend service and Gateway', () => {
  const compose = read('../docker-compose.yml');

  assert.match(compose, /^x-scaled-app: &scaled-app/m);
  assert.match(compose, /replicas: \$\{SERVICE_REPLICAS:-2\}/);
  for (const service of [
    'gateway',
    'identity-service',
    'catalog-service',
    'order-service',
    'notification-service',
    'analytics-service',
    'search-service',
    'ai-service'
  ]) {
    assert.match(
      compose,
      new RegExp(`^  ${service}:\\r?\\n    <<: \\*scaled-app`, 'm')
    );
  }
  assert.doesNotMatch(compose, /^  notification-service-2:/m);
  assert.match(compose, /^  system-integration:/m);
});

test('Nginx and realtime Gateway are configured for horizontal scaling', () => {
  const nginx = read('../infra/nginx/nginx.conf');
  const realtime = read('../api-gateway/src/services/realtime.service.js');

  assert.match(nginx, /resolver 127\.0\.0\.11/);
  assert.match(nginx, /server gateway:5000 resolve/);
  assert.match(nginx, /proxy_set_header Upgrade \$http_upgrade/);
  assert.match(realtime, /createAdapter\(publisher, subscriber\)/);
  assert.match(realtime, /groupId: 'realtime-gateway-group'/);
});

test('event integration waits for the six Kafka services and excludes stateless AI', () => {
  const integration = read('../scripts/event-integration.js');

  assert.match(
    integration,
    /\['identity','catalog','order','notification','analytics','search'\]/
  );
  assert.doesNotMatch(integration, /data\.every\(service/);
});

test('demo catalog satisfies the submission product baseline', () => {
  const products = JSON.parse(read('../services/catalog-service/src/seeds/data/products.json'));

  assert.ok(products.length >= 40);
  assert.ok(products.every(product => product.images.length >= 3));
  assert.ok(products.every(product => product.variants.length >= 2));
});

test('CI and bonus evidence cover the final system checks', () => {
  const workflow = read('../../.github/workflows/ci.yml');
  const bonus = read('../Bonus/README.md');
  const packageJson = JSON.parse(read('../package.json'));

  assert.match(workflow, /^  lint:/m);
  assert.match(workflow, /^  unit-tests:/m);
  assert.match(workflow, /^  frontend-build:/m);
  assert.match(workflow, /^  docker-integration:/m);
  assert.match(workflow, /needs: \[lint, unit-tests, frontend-build\]/);
  assert.match(workflow, /Run system integration test/);
  assert.match(workflow, /name: ci-evidence/);
  assert.match(workflow, /upload-artifact@v4/);
  assert.match(bonus, /Kafka consumer groups/);
  assert.equal(
    packageJson.scripts['system:integration'],
    'docker compose --profile test run --rm system-integration'
  );
});
