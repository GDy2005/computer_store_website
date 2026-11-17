import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createHttpCorsOptions,
  createSocketCorsConfig,
  getAllowedOrigins,
  isOriginAllowed
} from '../api-gateway/src/config/corsConfig.js';

test('CORS parses and normalizes a comma-separated origin allowlist', () => {
  assert.deepEqual(
    getAllowedOrigins({
      CORS_ALLOWED_ORIGINS: 'http://localhost/, https://store.example.com'
    }),
    ['http://localhost', 'https://store.example.com']
  );
});

test('CORS allows configured origins and non-browser requests only', () => {
  const allowed = ['http://localhost', 'https://store.example.com'];

  assert.equal(isOriginAllowed(undefined, allowed), true);
  assert.equal(isOriginAllowed('http://localhost', allowed), true);
  assert.equal(isOriginAllowed('https://evil.example.com', allowed), false);
  assert.equal(isOriginAllowed('not-an-origin', allowed), false);
});

test('HTTP CORS supports credentials without using a wildcard origin', () => {
  const options = createHttpCorsOptions({
    CORS_ALLOWED_ORIGINS: 'https://store.example.com'
  });
  let accepted;
  let rejected;

  options.origin('https://store.example.com', (error, value) => {
    assert.ifError(error);
    accepted = value;
  });
  options.origin('https://evil.example.com', (error, value) => {
    assert.ifError(error);
    rejected = value;
  });

  assert.equal(options.credentials, true);
  assert.equal(accepted, true);
  assert.equal(rejected, false);
});

test('Socket.IO rejects websocket handshakes from unlisted origins', () => {
  const options = createSocketCorsConfig({
    CORS_ALLOWED_ORIGINS: 'https://store.example.com'
  });
  let accepted;
  let rejected;

  options.allowRequest(
    {headers: {origin: 'https://store.example.com'}},
    (error, value) => {
      assert.equal(error, null);
      accepted = value;
    }
  );
  options.allowRequest(
    {headers: {origin: 'https://evil.example.com'}},
    (error, value) => {
      assert.equal(error, null);
      rejected = value;
    }
  );

  assert.deepEqual(options.cors.origin, ['https://store.example.com']);
  assert.equal(accepted, true);
  assert.equal(rejected, false);
});
