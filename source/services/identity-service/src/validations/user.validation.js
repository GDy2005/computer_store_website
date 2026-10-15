import {
  allowOnly,
  assertObject,
  optionalText,
  requiredText,
  validateBody,
  validationError
} from './helpers.js';

export const validateUpdateProfile = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['fullName', 'phone']);

  if (Object.keys(body).length === 0) {
    throw validationError(
      'At least one profile field is required'
    );
  }

  const result = {};

  if (body.fullName !== undefined) {
    result.fullName = requiredText(
      body.fullName,
      'fullName',
      100
    );
  }

  if (body.phone !== undefined) {
    result.phone = optionalText(
      body.phone,
      'phone',
      20,
      {allowNull: true}
    );
  }

  return result;
});
