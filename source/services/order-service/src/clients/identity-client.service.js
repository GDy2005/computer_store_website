import {AppError, signedContext} from '@store/validation';

export function createIdentityClient({
  baseUrl,
  secret
}) {
  async function request(path, options, requestId) {
    let response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          'content-type': 'application/json',
          'x-internal-token': signedContext(
            secret,
            requestId
          ),
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      throw new AppError(
        503,
        'IDENTITY_UNAVAILABLE',
        'Identity service is unavailable'
      );
    }

    const body = await response.json();

    if (!response.ok) {
      throw new AppError(
        response.status,
        body.error?.code || 'IDENTITY_ERROR',
        body.error?.message || 'Identity request failed'
      );
    }

    return body.data;
  }

  return {
    getUser(userId, requestId) {
      return request(
        `/internal/users/${encodeURIComponent(userId)}/summary`,
        {method: 'GET'},
        requestId
      );
    },

    resolveGuest(input, requestId) {
      return request(
        '/internal/users/resolve-checkout',
        {
          method: 'POST',
          body: JSON.stringify(input)
        },
        requestId
      );
    }
  };
}