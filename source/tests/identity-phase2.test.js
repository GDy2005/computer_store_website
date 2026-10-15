import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthController} from '../api-gateway/src/controllers/auth.controller.js';
import {normalizeGoogleProfile} from '../api-gateway/src/controllers/google-oauth.controller.js';
import {createPasswordTokenService} from '../services/identity-service/src/services/password-token.service.js';
import {validateLogin} from '../services/identity-service/src/validations/auth.validation.js';
import {validateUpdateProfile} from '../services/identity-service/src/validations/user.validation.js';
import {parseAddressInput} from '../services/identity-service/src/validations/address.validation.js';
import {enqueueUserCreated} from '../services/identity-service/src/events/user.events.js';

function runMiddleware(middleware, req) {
  return new Promise((resolve, reject) => {
    middleware(req, {}, error => error ? reject(error) : resolve(req));
  });
}

test('login validation preserves password whitespace', async () => {
  const req = {body: {email: ' USER@Example.COM ', password: '  secret value  '}};
  await runMiddleware(validateLogin, req);
  assert.equal(req.body.email, 'user@example.com');
  assert.equal(req.body.password, '  secret value  ');
});

test('profile validation rejects null fullName and allows clearing phone', async () => {
  await assert.rejects(
    runMiddleware(validateUpdateProfile, {body: {fullName: null}}),
    error => error.code === 'VALIDATION_ERROR' && error.status === 400
  );
  const req = {body: {phone: null}};
  await runMiddleware(validateUpdateProfile, req);
  assert.equal(req.body.phone, null);
});

test('address validation rejects client-controlled default flag', () => {
  assert.throws(
    () => parseAddressInput({recipientName: 'User', phone: '0900', addressLine: '1 Main', ward: 'Ward', district: 'District', province: 'Province', isDefault: true}),
    error => error.code === 'VALIDATION_ERROR'
  );
});

test('password token service stores a hash and finite expiry', async () => {
  let created;
  const PasswordToken = {
    updateMany: async () => ({acknowledged: true}),
    create: async documents => { [created] = documents; }
  };
  const service = createPasswordTokenService({PasswordToken});
  const rawToken = await service.issue({userId: 'user-1', type: 'ACTIVATION', session: {}});
  assert.equal(rawToken.length, 64);
  assert.notEqual(created.tokenHash, rawToken);
  assert.equal(created.tokenHash.length, 64);
  assert.ok(created.expiresAt > new Date());
});

test('user created event is stored in the outbox with identity ownership', async () => {
  let row;
  const Outbox = {create: async documents => { [row] = documents; }};
  await enqueueUserCreated({
    Outbox,
    user: {_id: {toString: () => 'user-1'}, email: 'user@example.com', fullName: 'User', role: 'CUSTOMER', accountStatus: 'PENDING_ACTIVATION'},
    correlationId: 'request-1',
    session: {}
  });
  assert.equal(row.topic, 'users.created.v1');
  assert.equal(row.payload.producer, 'identity-service');
  assert.equal(row.payload.payload.userId, 'user-1');
});

test('gateway login regenerates and saves the shared session', async () => {
  const controller = createAuthController({
    verifyCredentials: async input => {
      assert.deepEqual(input, {email: 'user@example.com', password: 'secret', requestId: 'request-1'});
      return {userId: 'user-1', role: 'CUSTOMER'};
    }
  });
  const req = {
    body: {email: 'user@example.com', password: 'secret'},
    requestId: 'request-1',
    session: {
      regenerate(callback) { callback(); },
      save(callback) { callback(); }
    }
  };
  let payload;
  await controller.login(req, {json(value) { payload = value; }}, error => { throw error; });
  assert.equal(req.session.userId, 'user-1');
  assert.equal(req.session.role, 'CUSTOMER');
  assert.equal(payload.success, true);
});

test('Google profile requires a verified email and normalizes it', () => {
  assert.deepEqual(
    normalizeGoogleProfile({
      id: 'google-user-1',
      displayName: 'Google User',
      emails: [{value: ' USER@Example.COM '}],
      _json: {email_verified: true}
    }),
    {
      providerUserId: 'google-user-1',
      email: 'user@example.com',
      fullName: 'Google User'
    }
  );

  assert.throws(
    () => normalizeGoogleProfile({
      id: 'google-user-1',
      displayName: 'Google User',
      emails: [{value: 'user@example.com'}],
      _json: {email_verified: false}
    }),
    error => error.code === 'OAUTH_PROFILE_INVALID'
  );
});
