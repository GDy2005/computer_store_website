import assert from 'node:assert/strict';

const baseUrl = process.env.APP_BASE_URL || 'http://ai-test-gateway:5000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  return {response, body};
}

const invalid = await request('/api/v1/ai/chat', {
  method: 'POST',
  body: JSON.stringify({message: 'Laptop', history: []})
});
assert.equal(invalid.response.status, 400);

const recommendation = await request('/api/v1/ai/chat', {
  method: 'POST',
  body: JSON.stringify({message: 'Tư vấn laptop gaming dưới 35 triệu'})
});
assert.equal(recommendation.response.status, 200);
assert.equal(recommendation.body.success, true);
assert.ok(recommendation.body.data.products.length > 0);
assert.equal(recommendation.body.data.meta.grounded, true);

for (const product of recommendation.body.data.products) {
  assert.ok(product.productId);
  assert.ok(product.name);
  assert.ok(Number.isFinite(product.minPrice));
  assert.equal(product.url, `/products/${encodeURIComponent(product.slug)}`);

  const detail = await request(`/api/v1/products/${encodeURIComponent(product.slug)}`);
  assert.equal(detail.response.status, 200);
  assert.equal(String(detail.body.data._id), product.productId);
}

const unsupported = await request('/api/v1/ai/chat', {
  method: 'POST',
  body: JSON.stringify({message: 'Tư vấn điện thoại dưới 10 triệu'})
});
assert.equal(unsupported.response.status, 200);
assert.equal(unsupported.body.data.products.length, 0);
assert.equal(unsupported.body.data.meta.strategy, 'scope-guard');

console.log('PASS AI chatbot integration');
