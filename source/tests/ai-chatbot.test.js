import test from 'node:test';
import assert from 'node:assert/strict';

import {createSearchClient} from '../services/ai-service/src/clients/search-client.service.js';
import {createAiProvider} from '../services/ai-service/src/services/ai-provider.service.js';
import {createChatService} from '../services/ai-service/src/services/chat.service.js';
import {extractIntent} from '../services/ai-service/src/services/intent.service.js';
import {validateChat} from '../services/ai-service/src/validations/chat.validation.js';

function validate(middleware, req) {
  let error;
  middleware(req, {}, value => { error = value; });
  if (error) throw error;
  return req;
}

const candidates = [
  {
    productId: 'product-1',
    slug: 'laptop-real-1',
    name: 'Laptop Real 1',
    brand: 'ASUS',
    category: 'laptop',
    minPrice: 20_000_000,
    maxPrice: 25_000_000,
    averageRating: 4.5,
    shortDescription: 'Laptop gaming',
    tags: ['gaming']
  },
  {
    productId: 'product-2',
    slug: 'laptop-real-2',
    name: 'Laptop Real 2',
    brand: 'Dell',
    category: 'laptop',
    minPrice: 18_000_000,
    maxPrice: 22_000_000,
    averageRating: 4,
    shortDescription: 'Laptop học tập',
    tags: ['student']
  }
];

test('AI chat validation accepts only a bounded message', () => {
  const req = validate(validateChat, {body: {message: '  Laptop nào tốt?  '}});
  assert.deepEqual(req.validatedBody, {message: 'Laptop nào tốt?'});
  assert.throws(() => validate(validateChat, {
    body: {message: 'Laptop', history: []}
  }));
});

test('intent extraction understands Vietnamese category, brand and budget', () => {
  assert.deepEqual(
    extractIntent('Tư vấn laptop ASUS gaming từ 20 đến 30 triệu'),
    {
      category: 'laptop',
      brand: 'ASUS',
      minPrice: 20_000_000,
      maxPrice: 30_000_000,
      search: 'gaming',
      needs: ['gaming'],
      unsupported: false
    }
  );
});

test('intent extraction blocks products outside the store scope', () => {
  assert.equal(extractIntent('Tư vấn điện thoại dưới 10 triệu').unsupported, true);
});

test('chat recommendations are grounded and use canonical product links', async () => {
  let received;
  const service = createChatService({
    searchClient: {
      async search(filters) {
        received = filters;
        return {items: candidates, meta: {}};
      }
    },
    aiProvider: {
      async chooseProducts(input) {
        assert.equal(input.intent.category, 'laptop');
        return ['product-2'];
      }
    }
  });

  const result = await service.reply({
    message: 'Laptop gaming dưới 30 triệu',
    requestId: 'request-1'
  });

  assert.equal(received.maxPrice, 30_000_000);
  assert.equal(result.meta.strategy, 'provider-ranked');
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].productId, 'product-2');
  assert.equal(result.products[0].url, '/products/laptop-real-2');
  assert.match(result.answer, /Laptop Real 2/);
});

test('provider failure and invented IDs fall back to real search candidates', async () => {
  for (const chooseProducts of [
    async () => ['invented-product'],
    async () => { throw new Error('quota exceeded'); }
  ]) {
    const service = createChatService({
      searchClient: {async search() { return {items: candidates}; }},
      aiProvider: {chooseProducts}
    });
    const result = await service.reply({message: 'Laptop', requestId: 'request-2'});

    assert.equal(result.meta.strategy, 'deterministic-fallback');
    assert.deepEqual(
      result.products.map(product => product.productId),
      ['product-1', 'product-2']
    );
  }
});

test('out-of-scope requests do not call Search Service', async () => {
  const service = createChatService({
    searchClient: {search: assert.fail},
    aiProvider: {chooseProducts: assert.fail}
  });
  const result = await service.reply({
    message: 'Có điện thoại Android nào không?',
    requestId: 'request-3'
  });

  assert.equal(result.meta.strategy, 'scope-guard');
  assert.deepEqual(result.products, []);
});

test('AI provider receives structured need instead of the raw personal message', async () => {
  let requestBody;
  const provider = createAiProvider({
    provider: 'openai',
    apiKey: 'test-key',
    model: 'test-model',
    request: async (url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            output: [{content: [{
              type: 'output_text',
              text: JSON.stringify({productIds: ['product-1']})
            }]}]
          };
        }
      };
    }
  });

  const selected = await provider.chooseProducts({
    intent: extractIntent('Laptop ASUS gaming dưới 30 triệu'),
    candidates,
    requestId: 'request-4'
  });
  const providerInput = JSON.parse(requestBody.input);

  assert.deepEqual(selected, ['product-1']);
  assert.equal(providerInput.need.category, 'laptop');
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.input.includes('email@example.com'), false);
});

test('Search client forwards supported filters with signed internal context', async () => {
  let receivedUrl;
  let receivedHeaders;
  const client = createSearchClient({
    baseUrl: 'http://search-service:5006/',
    secret: 'test-secret',
    request: async (url, options) => {
      receivedUrl = url;
      receivedHeaders = options.headers;
      return {
        ok: true,
        async json() {
          return {success: true, data: {items: candidates}, meta: {}};
        }
      };
    }
  });

  const result = await client.search({
    page: 1,
    limit: 8,
    category: 'laptop',
    maxPrice: 30_000_000,
    search: undefined,
    sort: 'price_desc'
  }, 'request-5');

  assert.match(receivedUrl, /category=laptop/);
  assert.match(receivedUrl, /maxPrice=30000000/);
  assert.doesNotMatch(receivedUrl, /search=/);
  assert.ok(receivedHeaders['x-internal-token']);
  assert.equal(result.items.length, 2);
});
