import {randomUUID} from 'node:crypto';

import {AppError, signedContext} from '@store/validation';

export function createCatalogClient({
  baseUrl = process.env.CATALOG_SERVICE_URL ||
    'http://catalog-service:5002',
  secret = process.env.INTERNAL_SERVICE_SECRET
} = {}) {
  const root = baseUrl.replace(/\/$/, '');

  if (!secret) {
    throw new Error('INTERNAL_SERVICE_SECRET required');
  }

  function internalHeaders() {
    const requestId = randomUUID();
    return {
      'x-request-id': requestId,
      'x-internal-token': signedContext(secret, requestId)
    };
  }

  async function get(path) {
    let response;

    try {
      response = await fetch(`${root}${path}`, {
        headers: internalHeaders(),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw new AppError(
        503,
        'CATALOG_UNAVAILABLE',
        'Catalog service is unavailable'
      );
    }

    if (!response.ok) {
      throw new AppError(
        response.status === 404 ? 404 : 503,
        response.status === 404
          ? 'NOT_FOUND'
          : 'CATALOG_UNAVAILABLE',
        response.status === 404
          ? 'Product not found'
          : 'Catalog service is unavailable'
      );
    }

    return (await response.json()).data;
  }

  return {
    getProductBySlug(slug) {
      return get(`/api/v1/products/${encodeURIComponent(slug)}`);
    },
    async getProducts(page, limit = 50) {
      const response = await fetch(
        `${root}/api/v1/products?page=${page}&limit=${limit}&sort=name_asc`,
        {
          headers: internalHeaders(),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.ok) {
        throw new AppError(
          503,
          'CATALOG_UNAVAILABLE',
          'Catalog service is unavailable'
        );
      }

      const payload = await response.json();
      return {items: payload.data.items, meta: payload.meta};
    }
  };
}
