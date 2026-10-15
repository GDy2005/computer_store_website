import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createElasticsearchClient
} from '../services/search-service/src/config/elasticsearch.js';
import {
  createSearchConsumers
} from '../services/search-service/src/events/search.consumer.js';
import {
  validateSearch
} from '../services/search-service/src/validations/search.validation.js';

test('search service loads the Elasticsearch mapping', () => {
  const client = createElasticsearchClient({
    baseUrl: 'http://elasticsearch:9200',
    indexName: 'products_test'
  });

  assert.equal(typeof client.ensureIndex, 'function');
  assert.equal(typeof client.search, 'function');
});

test('search validation normalizes pagination and filters', () => {
  const req = {
    query: {
      page: '2',
      limit: '20',
      search: ' gaming ',
      category: 'LAPTOP',
      minPrice: '1000000',
      maxPrice: '30000000',
      minRating: '4',
      sort: 'price_asc'
    }
  };
  let receivedError;

  validateSearch(req, {}, error => {
    receivedError = error;
  });

  assert.equal(receivedError, undefined);
  assert.deepEqual(req.validatedQuery, {
    page: 2,
    limit: 20,
    search: 'gaming',
    category: 'laptop',
    brand: undefined,
    minPrice: 1000000,
    maxPrice: 30000000,
    minRating: 4,
    sort: 'price_asc'
  });
});

test('search validation rejects invalid price range', () => {
  let receivedError;

  validateSearch(
    {query: {minPrice: '20', maxPrice: '10'}},
    {},
    error => {
      receivedError = error;
    }
  );

  assert.equal(receivedError.status, 400);
  assert.equal(receivedError.code, 'VALIDATION_ERROR');
});

test('search consumers synchronize products and ratings', async () => {
  const calls = [];
  const searchIndex = {
    async indexProduct(product) {
      calls.push(['index', product.slug]);
    },
    async deleteProduct(productId) {
      calls.push(['delete', productId]);
    },
    async updateRating(payload) {
      calls.push(['rating', payload.productId]);
    }
  };
  const catalogClient = {
    async getProductBySlug(slug) {
      calls.push(['fetch', slug]);
      return {slug};
    }
  };
  const consumers = createSearchConsumers({
    searchIndex,
    catalogClient
  });

  await consumers[0].handler({
    payload: {
      productId: 'product-1',
      slug: 'gaming-laptop',
      isActive: true
    }
  });
  await consumers[1].handler({
    payload: {
      productId: 'product-2',
      slug: 'old-product',
      isActive: false
    }
  });
  await consumers[2].handler({
    payload: {productId: 'product-1'}
  });

  assert.deepEqual(calls, [
    ['fetch', 'gaming-laptop'],
    ['index', 'gaming-laptop'],
    ['delete', 'product-2'],
    ['rating', 'product-1']
  ]);
});
