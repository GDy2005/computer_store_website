import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {signedContext} from '@store/validation';

const gatewayOne = process.env.GATEWAY_ONE_URL || 'http://gateway-1:5000';
const gatewayTwo = process.env.GATEWAY_TWO_URL || 'http://gateway-2:5000';
const email = process.env.AUTH_TEST_EMAIL || `auth-${randomUUID()}@example.invalid`;
const oauthEmail = `auth-google-${randomUUID()}@example.invalid`;
const firstPassword = 'Auth integration initial password!';
const secondPassword = 'Auth integration changed password!';
const finalPassword = 'Auth integration reset password!';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(baseUrl, path, {method = 'GET', body, cookie, status = 200} = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? {'content-type': 'application/json'} : {}),
      ...(cookie ? {cookie} : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json();
  if (response.status !== status) {
    throw new Error(`${method} ${path}: expected ${status}, received ${response.status} (${payload.error?.code || 'UNKNOWN'})`);
  }
  return {
    payload,
    cookie: response.headers.get('set-cookie')?.split(';')[0]
  };
}

async function resolveGoogle(body) {
  const requestId = randomUUID();
  const response = await fetch('http://identity-service:5001/internal/auth/google', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': signedContext(
        process.env.INTERNAL_SERVICE_SECRET,
        requestId
      )
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Google resolve failed: ${payload.error?.code || response.status}`);
  }
  return payload.data;
}

async function waitForActionUrl(outbox, type) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const row = await outbox.findOne(
      {
        topic: 'email.requested.v1',
        'payload.payload.recipientEmail': email,
        'payload.payload.type': type
      },
      {sort: {createdAt: -1}}
    );
    const url = row?.payload?.payload?.templateData?.actionUrl;
    if (url) return url;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${type} outbox event`);
}

const connection = await mongoose.createConnection(
  process.env.MONGODB_URI,
  {dbName: process.env.DB_NAME || 'identity_db'}
).asPromise();

const users = connection.db.collection('users');
const passwordTokens = connection.db.collection('password_tokens');
const outbox = connection.db.collection('outbox_events');
let userId;
let activeCookie;

try {
  const admin = await users.findOne({email: process.env.ADMIN_EMAIL || 'admin@example.com'});
  assert(admin?.role === 'ADMIN' && admin.accountStatus === 'ACTIVE' && typeof admin.passwordHash === 'string', 'Admin seed is missing or invalid');

  const registration = await request(gatewayOne, '/api/v1/auth/register', {
    method: 'POST',
    status: 201,
    body: {
      email,
      fullName: 'Phase Two Test',
      address: {
        label: 'Home',
        recipientName: 'Phase Two Test',
        phone: '0900000000',
        addressLine: '1 Integration Street',
        ward: 'Test Ward',
        district: 'Test District',
        province: 'Test Province'
      }
    }
  });
  userId = registration.payload.data.userId;

  const activationUrl = await waitForActionUrl(outbox, 'ACCOUNT_ACTIVATION');
  const activationToken = new URL(activationUrl).searchParams.get('token');
  assert(activationToken, 'Activation token missing from action URL');

  await request(gatewayTwo, '/api/v1/auth/activate', {
    method: 'POST',
    body: {token: activationToken, password: firstPassword}
  });

  const login = await request(gatewayOne, '/api/v1/auth/login', {
    method: 'POST',
    body: {email, password: firstPassword}
  });
  activeCookie = login.cookie;
  assert(activeCookie, 'Login did not return a session cookie');

  const me = await request(gatewayTwo, '/api/v1/users/me', {cookie: activeCookie});
  assert(me.payload.data.email === email, 'Session was not shared between gateways');

  await request(gatewayOne, '/api/v1/users/me', {
    method: 'PATCH',
    cookie: activeCookie,
    body: {fullName: 'Phase Two Updated', phone: '0911111111'}
  });

  const createdAddress = await request(gatewayTwo, '/api/v1/users/me/addresses', {
    method: 'POST',
    status: 201,
    cookie: activeCookie,
    body: {
      label: 'Office',
      recipientName: 'Phase Two Updated',
      phone: '0911111111',
      addressLine: '2 Integration Street',
      ward: 'Test Ward',
      district: 'Test District',
      province: 'Test Province'
    }
  });
  const addressId = createdAddress.payload.data._id;

  await request(gatewayOne, `/api/v1/users/me/addresses/${addressId}/default`, {
    method: 'PATCH',
    cookie: activeCookie
  });
  const addresses = await request(gatewayTwo, '/api/v1/users/me/addresses', {cookie: activeCookie});
  assert(addresses.payload.data.filter(address => address.isDefault).length === 1, 'Default address invariant failed');

  await request(gatewayOne, `/api/v1/users/me/addresses/${addressId}`, {
    method: 'DELETE',
    cookie: activeCookie
  });

  await request(gatewayTwo, '/api/v1/users/me/password', {
    method: 'PATCH',
    cookie: activeCookie,
    body: {currentPassword: firstPassword, newPassword: secondPassword}
  });

  await request(gatewayOne, '/api/v1/auth/logout', {
    method: 'POST',
    cookie: activeCookie
  });
  await request(gatewayTwo, '/api/v1/users/me', {cookie: activeCookie, status: 401});
  await request(gatewayOne, '/api/v1/auth/login', {
    method: 'POST',
    status: 401,
    body: {email, password: firstPassword}
  });

  const changedLogin = await request(gatewayTwo, '/api/v1/auth/login', {
    method: 'POST',
    body: {email, password: secondPassword}
  });
  activeCookie = changedLogin.cookie;

  await request(gatewayOne, '/api/v1/auth/forgot-password', {
    method: 'POST',
    status: 202,
    body: {email}
  });
  const resetUrl = await waitForActionUrl(outbox, 'PASSWORD_RESET');
  const resetToken = new URL(resetUrl).searchParams.get('token');
  assert(resetToken, 'Reset token missing from action URL');

  await request(gatewayTwo, '/api/v1/auth/reset-password', {
    method: 'POST',
    body: {token: resetToken, password: finalPassword}
  });
  await request(gatewayOne, '/api/v1/auth/reset-password', {
    method: 'POST',
    status: 400,
    body: {token: resetToken, password: finalPassword}
  });
  await request(gatewayOne, '/api/v1/auth/login', {
    method: 'POST',
    status: 401,
    body: {email, password: secondPassword}
  });
  await request(gatewayOne, '/api/v1/auth/logout', {
    method: 'POST',
    cookie: activeCookie
  });
  const finalLogin = await request(gatewayTwo, '/api/v1/auth/login', {
    method: 'POST',
    body: {email, password: finalPassword}
  });
  await request(gatewayOne, '/api/v1/auth/logout', {
    method: 'POST',
    cookie: finalLogin.cookie
  });

  const googleInput = {
    providerUserId: `google-${randomUUID()}`,
    email: oauthEmail,
    fullName: 'Google Integration User'
  };
  const googleUser = await resolveGoogle(googleInput);
  const duplicateGoogleUser = await resolveGoogle(googleInput);
  assert(googleUser.userId === duplicateGoogleUser.userId, 'Google identity resolution is not idempotent');
  const persistedGoogleUser = await users.findOne({email: oauthEmail});
  assert(persistedGoogleUser?.accountStatus === 'ACTIVE', 'Google user was not activated');
  assert(persistedGoogleUser?.passwordHash === null, 'Google user unexpectedly has a local password');
  assert(persistedGoogleUser?.socialAccounts?.[0]?.provider === 'GOOGLE', 'Google identity was not linked');
  assert(await outbox.countDocuments({key: googleUser.userId, topic: 'users.created.v1'}) === 1, 'Google user did not create exactly one user event');

  console.log('PASS identity: admin seed, local auth, shared session, profile, addresses, password recovery and Google user resolution');
} finally {
  const user = userId
    ? await users.findOne({_id: new mongoose.Types.ObjectId(userId)})
    : await users.findOne({email});
  if (user) {
    await passwordTokens.deleteMany({userId: user._id});
    await outbox.deleteMany({key: user._id.toString()});
    await users.deleteOne({_id: user._id});
  }
  const googleUser = await users.findOne({email: oauthEmail});
  if (googleUser) {
    await passwordTokens.deleteMany({userId: googleUser._id});
    await outbox.deleteMany({key: googleUser._id.toString()});
    await users.deleteOne({_id: googleUser._id});
  }
  await connection.close();
}
