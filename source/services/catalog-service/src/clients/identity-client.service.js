import {
  AppError,
  signedContext
} from '@store/validation';

export function createIdentityClient({
  identityUrl,
  secret
}) {
  async function getUserSummary({
    userId,
    requestId
  }) {
    let response;

    try {
      response = await fetch(
        `${identityUrl}/internal/users/${encodeURIComponent(userId)}/summary`,
        {
          headers: {
            'x-internal-token': signedContext(
              secret,
              requestId
            )
          },
          signal: AbortSignal.timeout(5000)
        }
      );
    } catch {
      throw new AppError(
        502,
        'UPSTREAM_UNAVAILABLE',
        'Identity service unavailable'
      );
    }

    let payload;

    try {
      payload = await response.json();
    } catch {
      throw new AppError(
        502,
        'UPSTREAM_INVALID_RESPONSE',
        'Identity service returned invalid data'
      );
    }

    if (!response.ok) {
      throw new AppError(
        response.status,
        payload.error?.code || 'UPSTREAM_ERROR',
        payload.error?.message || 'Identity unavailable'
      );
    }

    return payload.data;
  }

  return {getUserSummary};
}