import mongoose from 'mongoose';
import {AppError} from '@store/validation';

export function validationError(message, details = []) {
  return new AppError(
    400,
    'VALIDATION_ERROR',
    message,
    details
  );
}

export function assertObject(value, message = 'Invalid body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(message);
  }

  return value;
}

export function allowOnly(value, allowedFields) {
  const unknown = Object.keys(value).filter(
    key => !allowedFields.includes(key)
  );

  if (unknown.length > 0) {
    throw validationError(
      `Unknown fields: ${unknown.join(', ')}`
    );
  }
}

export function requiredText(value, field, maxLength = 255) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw validationError(`Invalid ${field}`);
  }

  return value.trim();
}

export function optionalText(
  value,
  field,
  maxLength = 255,
  {allowNull = false} = {}
) {
  if (value === undefined) {
    return value;
  }

  if (value === null && allowNull) return null;

  return requiredText(value, field, maxLength);
}

export function parseEmail(value) {
  const email = requiredText(value, 'email', 254).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError('Invalid email');
  }

  return email;
}

export function parsePassword(
  value,
  {minimumLength = 8} = {}
) {
  if (
    typeof value !== 'string' ||
    value.length < minimumLength ||
    Buffer.byteLength(value, 'utf8') > 72
  ) {
    throw validationError(
      `Password must contain at least ${minimumLength} characters and at most 72 bytes`
    );
  }

  return value;
}

export function validateBody(parser) {
  return (req, res, next) => {
    try {
      req.body = parser(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateObjectIdParam(name) {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[name])) {
      return next(validationError(`Invalid ${name}`));
    }

    next();
  };
}
