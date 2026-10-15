import {
  allowOnly,
  assertObject,
  optionalText,
  requiredText,
  validateBody,
  validateObjectIdParam,
  validationError
} from './helpers.js';

const addressFields = [
  'label',
  'recipientName',
  'phone',
  'addressLine',
  'ward',
  'district',
  'province'
];

export function parseAddressInput(value, options = {}) {
  const {partial = false} = options;

  assertObject(value, 'Address must be an object');
  allowOnly(value, addressFields);

  if (partial && Object.keys(value).length === 0) {
    throw validationError(
      'At least one address field is required'
    );
  }

  const result = {};

  if (!partial || value.recipientName !== undefined) {
    result.recipientName = requiredText(
      value.recipientName,
      'recipientName',
      100
    );
  }

  if (!partial || value.phone !== undefined) {
    result.phone = requiredText(value.phone, 'phone', 20);
  }

  if (!partial || value.addressLine !== undefined) {
    result.addressLine = requiredText(
      value.addressLine,
      'addressLine',
      255
    );
  }

  if (!partial || value.ward !== undefined) {
    result.ward = requiredText(value.ward, 'ward', 100);
  }

  if (!partial || value.district !== undefined) {
    result.district = requiredText(
      value.district,
      'district',
      100
    );
  }

  if (!partial || value.province !== undefined) {
    result.province = requiredText(
      value.province,
      'province',
      100
    );
  }

  if (value.label !== undefined) {
    result.label = optionalText(value.label, 'label', 50);
  }

  return result;
}

export const validateCreateAddress = validateBody(
  body => parseAddressInput(body)
);

export const validateUpdateAddress = validateBody(
  body => parseAddressInput(body, {partial: true})
);

export const validateAddressId =
  validateObjectIdParam('id');