import mongoose from 'mongoose';
import {AppError} from '@store/validation';

function fail(message) {
  throw new AppError(
    400,
    'VALIDATION_ERROR',
    message
  );
}

function object(value, name = 'body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`Invalid ${name}`);
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

function text(value, name, maximum = 255) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > maximum
  ) {
    fail(`Invalid ${name}`);
  }

  return value.trim();
}

function email(value) {
  const result = text(value, 'email', 254).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    fail('Invalid email');
  }

  return result;
}

function objectId(value, name) {
  if (
    typeof value !== 'string' ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    fail(`Invalid ${name}`);
  }

  return value;
}

function middleware(parser) {
  return (req, res, next) => {
    try {
      req.body = parser(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const validateAddItem = middleware(body => {
  object(body);
  allowOnly(body, ['productId', 'variantId', 'quantity']);

  return {
    productId: objectId(body.productId, 'productId'),
    variantId: objectId(body.variantId, 'variantId'),
    quantity: Number.isInteger(body.quantity)
      && body.quantity >= 1
      && body.quantity <= 99
      ? body.quantity
      : fail('Invalid quantity')
  };
});

export const validateQuantity = middleware(body => {
  object(body);
  allowOnly(body, ['quantity']);

  return {
    quantity: Number.isInteger(body.quantity)
      && body.quantity >= 1
      && body.quantity <= 99
      ? body.quantity
      : fail('Invalid quantity')
  };
});

export const validateCoupon = middleware(body => {
  object(body);
  allowOnly(body, ['code']);

  return {
    code: text(body.code, 'code', 50).toUpperCase()
  };
});

export const validatePreview = middleware(body => {
  object(body);
  allowOnly(body, ['couponCode']);

  return {
    couponCode: body.couponCode
      ? text(body.couponCode, 'couponCode', 50).toUpperCase()
      : null
  };
});

export const validatePlaceOrder = middleware(body => {
  object(body);
  object(body.customer, 'customer');
  object(body.shippingAddress, 'shippingAddress');
  allowOnly(body, [
    'checkoutId',
    'couponCode',
    'paymentMethod',
    'customer',
    'shippingAddress'
  ]);
  allowOnly(body.customer, [
    'fullName',
    'email',
    'phone'
  ]);
  allowOnly(body.shippingAddress, [
    'recipientName',
    'phone',
    'addressLine',
    'ward',
    'district',
    'province'
  ]);

  if (
    typeof body.checkoutId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.checkoutId)
  ) {
    fail('Invalid checkoutId');
  }

  const paymentMethod = body.paymentMethod || 'COD';

  if (!['COD', 'SIMULATED_ONLINE'].includes(paymentMethod)) {
    fail('Invalid paymentMethod');
  }

  return {
    checkoutId: body.checkoutId,
    couponCode: body.couponCode
      ? text(body.couponCode, 'couponCode', 50).toUpperCase()
      : null,
    paymentMethod,
    customer: {
      fullName: text(body.customer.fullName, 'fullName', 100),
      email: email(body.customer.email),
      phone: text(body.customer.phone, 'phone', 20)
    },
    shippingAddress: {
      recipientName: text(
        body.shippingAddress.recipientName,
        'recipientName',
        100
      ),
      phone: text(body.shippingAddress.phone, 'phone', 20),
      addressLine: text(
        body.shippingAddress.addressLine,
        'addressLine',
        255
      ),
      ward: text(body.shippingAddress.ward, 'ward', 100),
      district: text(body.shippingAddress.district, 'district', 100),
      province: text(body.shippingAddress.province, 'province', 100)
    }
  };
});

export function validateOrderListQuery(req, res, next) {
  try {
    const allowed = ['page', 'limit'];
    const unknown = Object.keys(req.query).filter(
      key => !allowed.includes(key)
    );

    if (unknown.length > 0) {
      fail(`Unknown query parameters: ${unknown.join(', ')}`);
    }

    const parseInteger = (value, fallback, maximum, name) => {
      if (value === undefined) return fallback;
      if (!/^\d+$/.test(value)) fail(`Invalid ${name}`);
      const result = Number(value);
      if (!Number.isSafeInteger(result) || result < 1 || result > maximum) {
        fail(`Invalid ${name}`);
      }
      return result;
    };

    req.validatedQuery = {
      page: parseInteger(req.query.page, 1, 100000, 'page'),
      limit: parseInteger(req.query.limit, 10, 50, 'limit')
    };
    next();
  } catch (error) {
    next(error);
  }
}
