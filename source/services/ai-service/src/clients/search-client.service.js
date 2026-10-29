import {randomUUID} from 'node:crypto';

import {AppError, signedContext} from '@store/validation';

export function createSearchClient({
  baseUrl = process.env.SEARCH_SERVICE_URL ||
    'http://search-service:5006',
  secret = process.env.INTERNAL_SERVICE_SECRET,
  request = fetch
} = {}) {
  if (!secret) throw new Error('INTERNAL_SERVICE_SECRET required');

  const root = baseUrl.replace(/\/$/, '');

  return {
    async search(filters, correlationId = randomUUID()) {
      const query = new URLSearchParams();

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      }

      let response;

      try {
        response = await request(
          `${root}/api/v1/search?${query.toString()}`,
          {
            headers: {
              'x-request-id': correlationId,
              'x-internal-token': signedContext(secret, correlationId)
            },
            signal: AbortSignal.timeout(8000)
          }
        );
      } catch {
        throw new AppError(
          503,
          'SEARCH_UNAVAILABLE',
          'Search service is unavailable'
        );
      }

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new AppError(
          503,
          'SEARCH_UNAVAILABLE',
          'Search service is unavailable'
        );
      }

      return {
        items: payload.data?.items || [],
        meta: payload.meta || {}
      };
    }
  };
}
