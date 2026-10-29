import {
  allowOnly,
  assertObject,
  optionalText,
  requiredText,
  validateBody,
  validateObjectIdParam,
  validationError
} from './helpers.js';

function parseQueryInteger(
  value,
  field,
  {minimum = 1, maximum = Number.MAX_SAFE_INTEGER} = {}
) {
  if (value === undefined) return undefined;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw validationError(`Invalid ${field}`);
  }

  const result = Number(value);

  if (
    !Number.isSafeInteger(result) ||
    result < minimum ||
    result > maximum
  ) {
    throw validationError(`Invalid ${field}`);
  }

  return result;
}

export function validateAdminUserList(req, res, next) {
  try {
    allowOnly(req.query, [
      'page',
      'limit',
      'search',
      'isBanned',
      'accountStatus'
    ]);

    let isBanned;

    if (req.query.isBanned !== undefined) {
      if (!['true', 'false'].includes(req.query.isBanned)) {
        throw validationError('Invalid isBanned');
      }

      isBanned = req.query.isBanned === 'true';
    }

    let accountStatus;

    if (req.query.accountStatus !== undefined) {
      if (
        !['ACTIVE', 'PENDING_ACTIVATION'].includes(
          req.query.accountStatus
        )
      ) {
        throw validationError('Invalid accountStatus');
      }

      accountStatus = req.query.accountStatus;
    }

    req.validatedQuery = {
      page: parseQueryInteger(req.query.page, 'page') || 1,
      limit: parseQueryInteger(
        req.query.limit,
        'limit',
        {maximum: 50}
      ) || 20,
      search: req.query.search === undefined
        ? undefined
        : requiredText(req.query.search, 'search', 100),
      isBanned,
      accountStatus
    };

    next();
  } catch (error) {
    next(error);
  }
}

export const validateAdminUserId =
  validateObjectIdParam('id');

export const validateAdminUserUpdate = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['fullName', 'phone']);

  if (Object.keys(body).length === 0) {
    throw validationError(
      'At least one user field is required'
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

export const validateAdminUserBan = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['isBanned']);

  if (typeof body.isBanned !== 'boolean') {
    throw validationError('Invalid isBanned');
  }

  return {isBanned: body.isBanned};
});
