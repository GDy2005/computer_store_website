import mongoose from 'mongoose';
import {AppError} from '@store/validation';

export function validationError(message) {
  return new AppError(
    400,
    'VALIDATION_ERROR',
    message
  );
}

export function assertObject(value, message = 'Invalid request body') {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw validationError(message);
  }
}

export function allowOnly(value, fields) {
  const unknown = Object.keys(value).filter(
    key => !fields.includes(key)
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

export function parseBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw validationError(`Invalid ${field}`);
  }

  return value;
}

export function parseInteger(
  value,
  field,
  {minimum = 0, maximum = Number.MAX_SAFE_INTEGER} = {}
) {
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw validationError(`Invalid ${field}`);
  }

  return value;
}

export function parseQueryInteger(
  value,
  field,
  options
) {
  if (value === undefined) return undefined;

  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value)
  ) {
    throw validationError(`Invalid ${field}`);
  }

  return parseInteger(Number(value), field, options);
}

export function parseObjectId(value, field) {
  if (
    typeof value !== 'string' ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    throw validationError(`Invalid ${field}`);
  }

  return value;
}

export function parseEmail(value) {
  const email = requiredText(
    value,
    'guestEmail',
    254
  ).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError('Invalid guestEmail');
  }

  return email;
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
    try {
      req.params[name] = parseObjectId(
        req.params[name],
        name
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}