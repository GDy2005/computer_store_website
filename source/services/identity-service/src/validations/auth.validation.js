import {
  allowOnly,
  assertObject,
  parseEmail,
  parsePassword,
  requiredText,
  validateBody
} from './helpers.js';

import {
  parseAddressInput
} from './address.validation.js';

export const validateRegister = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['email', 'fullName', 'address']);

  return {
    email: parseEmail(body.email),
    fullName: requiredText(body.fullName, 'fullName', 100),
    address: parseAddressInput(body.address)
  };
});

export const validateActivate = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['token', 'password']);

  return {
    token: requiredText(body.token, 'token', 200),
    password: parsePassword(body.password)
  };
});

export const validateLogin = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['email', 'password']);

  return {
    email: parseEmail(body.email),
    password: parsePassword(
      body.password,
      {minimumLength: 1}
    )
  };
});

export const validateForgotPassword = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['email']);

  return {
    email: parseEmail(body.email)
  };
});

export const validateResetPassword = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['token', 'password']);

  return {
    token: requiredText(body.token, 'token', 200),
    password: parsePassword(body.password)
  };
});

export const validateChangePassword = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['currentPassword', 'newPassword']);

  return {
    currentPassword: requiredText(
      body.currentPassword,
      'currentPassword',
      72
    ),
    newPassword: parsePassword(body.newPassword)
  };
});

export const validateGoogleProfile = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['providerUserId', 'email', 'fullName']);

  return {
    providerUserId: requiredText(
      body.providerUserId,
      'providerUserId',
      255
    ),
    email: parseEmail(body.email),
    fullName: requiredText(body.fullName, 'fullName', 100)
  };
});
