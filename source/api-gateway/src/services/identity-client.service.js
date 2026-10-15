import {AppError, signedContext} from '@store/validation';

export function createIdentityClient({
  identityUrl,
  secret
}) {
  async function post(path, body, requestId) {
    let response;

    try {
      response = await fetch(
        `${identityUrl}${path}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': signedContext(
              secret,
              requestId
            )
          },
          body: JSON.stringify(body),
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
        'Identity service returned an invalid response'
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

  function verifyCredentials({email, password, requestId}) {
    return post(
      '/internal/auth/verify-credentials',
      {email, password},
      requestId
    );
  }

  function resolveGoogleUser({
    providerUserId,
    email,
    fullName,
    requestId
  }) {
    return post(
      '/internal/auth/google',
      {providerUserId, email, fullName},
      requestId
    );
  }

  return {verifyCredentials, resolveGoogleUser};
}
