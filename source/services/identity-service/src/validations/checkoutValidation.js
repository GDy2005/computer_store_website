import {
  allowOnly,
  assertObject,
  parseEmail,
  requiredText,
  validateBody
} from './helpers.js';

import {
  parseAddressInput
} from './addressValidation.js';

export const validateResolveCheckout = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['email', 'fullName', 'phone', 'address']);

  return {
    email: parseEmail(body.email),
    fullName: requiredText(body.fullName, 'fullName', 100),
    phone: requiredText(body.phone, 'phone', 20),
    address: parseAddressInput(body.address)
  };
});
