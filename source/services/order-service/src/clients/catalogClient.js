import {AppError, signedContext} from '@store/validation';

export function createCatalogClient({
  baseUrl,
  secret
}) {
  return {
    async quote(items, requestId) {
      let response;

      try {
        response = await fetch(
          `${baseUrl}/internal/catalog/quote`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-token': signedContext(
                secret,
                requestId
              )
            },
            body: JSON.stringify({items}),
            signal: AbortSignal.timeout(5000)
          }
        );
      } catch {
        throw new AppError(
          503,
          'CATALOG_UNAVAILABLE',
          'Catalog service is unavailable'
        );
      }

      const body = await response.json();

      if (!response.ok) {
        throw new AppError(
          response.status,
          body.error?.code || 'CATALOG_ERROR',
          body.error?.message || 'Catalog request failed'
        );
      }

      return body.data.items;
    }
  };
}