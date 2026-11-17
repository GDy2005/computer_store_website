import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {VIETNAM_DEMO_ADDRESSES} from '@store/validation';
import {createAuthController} from '../api-gateway/src/controllers/authController.js';
import {normalizeGoogleProfile} from '../api-gateway/src/controllers/googleOauthController.js';
import {createPasswordTokenService} from '../services/identity-service/src/services/passwordTokenService.js';
import {validateLogin} from '../services/identity-service/src/validations/authValidation.js';
import {validateUpdateProfile} from '../services/identity-service/src/validations/userValidation.js';
import {parseAddressInput} from '../services/identity-service/src/validations/addressValidation.js';
import {enqueueUserCreated} from '../services/identity-service/src/events/user.events.js';
import {toUserResponseDTO} from '../services/identity-service/src/dto/response/UserResponseDTO.js';
import {createAddressService} from '../services/identity-service/src/services/addressService.js';
import {createAuthService} from '../services/identity-service/src/services/authService.js';

const DEFAULT_AVATAR_URL =
  'https://res.cloudinary.com/ipc-media/image/upload/v1794128471/hcibhstn0zhnhzfxyipw.webp';

function runMiddleware(middleware, req) {
  return new Promise((resolve, reject) => {
    middleware(req, {}, error => error ? reject(error) : resolve(req));
  });
}

test('identity login validation preserves password whitespace', async () => {
  const req = {body: {email: ' USER@Example.COM ', password: '  secret value  '}};
  await runMiddleware(validateLogin, req);
  assert.equal(req.body.email, 'user@example.com');
  assert.equal(req.body.password, '  secret value  ');
});

test('correct credentials for a banned account return a dedicated error', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const authService = createAuthService({
    userRepository: {
      async findByEmail() {
        return {
          _id: {toString: () => 'user-1'},
          role: 'CUSTOMER',
          accountStatus: 'ACTIVE',
          isBanned: true,
          passwordHash
        };
      }
    }
  });

  await assert.rejects(
    authService.verifyCredentials({
      email: 'customer@example.com',
      password: 'correct-password'
    }),
    error => error.status === 403 && error.code === 'ACCOUNT_BANNED'
  );
});

test('wrong password does not reveal that an account is banned', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const authService = createAuthService({
    userRepository: {
      async findByEmail() {
        return {
          accountStatus: 'ACTIVE',
          isBanned: true,
          passwordHash
        };
      }
    }
  });

  await assert.rejects(
    authService.verifyCredentials({
      email: 'customer@example.com',
      password: 'wrong-password'
    }),
    error => error.status === 401 && error.code === 'INVALID_CREDENTIALS'
  );
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
    () => parseAddressInput({
      recipientName: 'User',
      phone: '0900',
      ...VIETNAM_DEMO_ADDRESSES.BEN_THANH,
      isDefault: true
    }),
    error => error.code === 'VALIDATION_ERROR'
  );
});

test('address validation accepts current two-level administrative codes', () => {
  const result = parseAddressInput({
    label: 'HOME',
    recipientName: 'User',
    phone: '0900000000',
    ...VIETNAM_DEMO_ADDRESSES.CHO_QUAN
  });

  assert.equal(result.wardCode, '27301');
  assert.equal(result.provinceCode, '79');
  assert.equal(result.district, undefined);
});

test('address validation rejects the removed district field', () => {
  assert.throws(
    () => parseAddressInput(
      {district: 'Quận 1'},
      {partial: true}
    ),
    error => error.code === 'VALIDATION_ERROR'
  );
});

test('address service keeps the final delivery address', async () => {
  const onlyAddress = {
    _id: {toString: () => 'address-1'},
    isDefault: true,
    deleteOne() {
      assert.fail('The final address must not be deleted');
    }
  };
  const addresses = [onlyAddress];
  addresses.id = id => id === 'address-1' ? onlyAddress : null;
  const service = createAddressService({
    userRepository: {
      async findAvailableById() {
        return {addresses};
      },
      async save() {
        assert.fail('A rejected deletion must not be saved');
      }
    }
  });

  await assert.rejects(
    service.remove('user-1', 'address-1'),
    error => error.status === 409 && error.code === 'LAST_ADDRESS_REQUIRED'
  );
});

test('deleting a default address promotes a remaining address', async () => {
  let saved = false;
  const home = {
    _id: {toString: () => 'home'},
    isDefault: true,
    deleteOne() {
      addresses.splice(addresses.indexOf(this), 1);
    }
  };
  const office = {
    _id: {toString: () => 'office'},
    isDefault: false,
    deleteOne() {
      addresses.splice(addresses.indexOf(this), 1);
    }
  };
  const addresses = [home, office];
  addresses.id = id => addresses.find(
    address => address._id.toString() === id
  ) || null;
  const service = createAddressService({
    userRepository: {
      async findAvailableById() {
        return {addresses};
      },
      async save() {
        saved = true;
      }
    }
  });

  await service.remove('user-1', 'home');

  assert.equal(saved, true);
  assert.equal(addresses.length, 1);
  assert.equal(office.isDefault, true);
});

test('identity user response supplies the configured default avatar', () => {
  const result = toUserResponseDTO({
    _id: 'user-1',
    email: 'user@example.com',
    fullName: 'User A',
    role: 'CUSTOMER',
    accountStatus: 'ACTIVE'
  });

  assert.equal(result.avatarUrl, DEFAULT_AVATAR_URL);
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
