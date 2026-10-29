import mongoose from 'mongoose';
import {AppError} from '@store/validation';

function fail(message) {
  throw new AppError(400, 'VALIDATION_ERROR', message);
}

function assertObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('Invalid body');
  }
}

function allowOnly(value, fields) {
  const unknown = Object.keys(value).filter(
    key => !fields.includes(key)
  );

  if (unknown.length > 0) {
    fail(`Unknown fields: ${unknown.join(', ')}`);
  }
}

function parseInteger(
  value,
  name,
  {minimum = 1, maximum = Number.MAX_SAFE_INTEGER} = {}
) {
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(`Invalid ${name}`);
  }

  return value;
}

function parseQueryInteger(value, name, options) {
  if (value === undefined) return undefined;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    fail(`Invalid ${name}`);
  }

  return parseInteger(Number(value), name, options);
}

function parseSearch(value) {
  if (value === undefined) return undefined;

  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > 100
  ) {
    fail('Invalid search');
  }

  return value.trim();
}

function parseBooleanQuery(value, name) {
  if (value === undefined) return undefined;

  if (!['true', 'false'].includes(value)) {
    fail(`Invalid ${name}`);
  }

  return value === 'true';
}

function parseDate(value, name, {endOfDay = false} = {}) {
  if (value === undefined) return undefined;

  if (typeof value !== 'string' || !value.trim()) {
    fail(`Invalid ${name}`);
  }

  const input = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const time = endOfDay
    ? '23:59:59.999'
    : '00:00:00.000';
  const date = new Date(
    dateOnly ? `${input}T${time}Z` : input
  );

  if (Number.isNaN(date.getTime())) {
    fail(`Invalid ${name}`);
  }

  if (
    dateOnly &&
    date.toISOString().slice(0, 10) !== input
  ) {
    fail(`Invalid ${name}`);
  }

  return date;
}

export function validateAdminOrderList(req, res, next) {
  try {
    allowOnly(req.query, [
      'page',
      'limit',
      'search',
      'status',
      'startDate',
      'endDate'
    ]);

    let status;

    if (req.query.status !== undefined) {
      const statuses = [
        'PENDING',
        'CONFIRMED',
        'SHIPPING',
        'DELIVERED',
        'CANCELLED'
      ];

      if (!statuses.includes(req.query.status)) {
        fail('Invalid status');
      }

      status = req.query.status;
    }

    const startDate = parseDate(
      req.query.startDate,
      'startDate'
    );
    const endDate = parseDate(
      req.query.endDate,
      'endDate',
      {endOfDay: true}
    );

    if (startDate && endDate && startDate > endDate) {
      fail('startDate cannot exceed endDate');
    }

    req.validatedQuery = {
      page: parseQueryInteger(req.query.page, 'page') || 1,
      limit: parseQueryInteger(
        req.query.limit,
        'limit',
        {maximum: 50}
      ) || 20,
      search: parseSearch(req.query.search),
      status,
      startDate,
      endDate
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function validateAdminCouponList(req, res, next) {
  try {
    allowOnly(req.query, [
      'page',
      'limit',
      'search',
      'isActive'
    ]);

    req.validatedQuery = {
      page: parseQueryInteger(req.query.page, 'page') || 1,
      limit: parseQueryInteger(
        req.query.limit,
        'limit',
        {maximum: 50}
      ) || 20,
      search: parseSearch(req.query.search),
      isActive: parseBooleanQuery(
        req.query.isActive,
        'isActive'
      )
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function validateAdminId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    next(new AppError(400, 'VALIDATION_ERROR', 'Invalid id'));
    return;
  }

  next();
}

function bodyMiddleware(parser) {
  return (req, res, next) => {
    try {
      req.body = parser(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const validateCreateCoupon = bodyMiddleware(body => {
  assertObject(body);
  allowOnly(body, [
    'code',
    'discountType',
    'discountValue',
    'usageLimit',
    'isActive'
  ]);

  if (typeof body.code !== 'string') {
    fail('Invalid code');
  }

  const code = body.code.trim().toUpperCase();

  if (!/^[A-Z0-9]{5}$/.test(code)) {
    fail('Coupon code must contain exactly 5 letters or digits');
  }

  if (!['PERCENTAGE', 'FIXED'].includes(body.discountType)) {
    fail('Invalid discountType');
  }

  const output = {
    code,
    discountType: body.discountType,
    discountValue: parseInteger(
      body.discountValue,
      'discountValue',
      {
        maximum: body.discountType === 'PERCENTAGE'
          ? 100
          : 1000000000
      }
    ),
    usageLimit: parseInteger(
      body.usageLimit,
      'usageLimit',
      {maximum: 10}
    )
  };

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      fail('Invalid isActive');
    }

    output.isActive = body.isActive;
  }

  return output;
});

export const validateAdminOrderStatus = bodyMiddleware(body => {
  assertObject(body);
  allowOnly(body, ['status', 'note']);

  if (!['SHIPPING', 'DELIVERED', 'CANCELLED'].includes(body.status)) {
    fail('Invalid order status');
  }

  let note = null;

  if (body.note !== undefined && body.note !== null) {
    if (
      typeof body.note !== 'string' ||
      !body.note.trim() ||
      body.note.trim().length > 255
    ) {
      fail('Invalid note');
    }

    note = body.note.trim();
  }

  return {status: body.status, note};
});
