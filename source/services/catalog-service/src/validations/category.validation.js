import {
  allowOnly,
  assertObject,
  parseBoolean,
  requiredText,
  validateBody,
  validateObjectIdParam,
  validationError
} from './helpers.js';

export function parseFeatured(value) {
  if (value === undefined) return undefined;

  if (!['true', 'false'].includes(value)) {
    throw validationError(
      'featured must be true or false'
    );
  }

  return value === 'true';
}

function parseSlug(value) {
  const slug = requiredText(
    value,
    'slug',
    100
  ).toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw validationError('Invalid slug');
  }

  return slug;
}

function parseCategory(body, {partial = false} = {}) {
  assertObject(body);

  allowOnly(body, [
    'name',
    'slug',
    'description',
    'imageUrl',
    'isFeatured',
    'isActive'
  ]);

  if (partial && Object.keys(body).length === 0) {
    throw validationError(
      'At least one category field is required'
    );
  }

  const output = {};

  function read(field, parser) {
    if (!partial || body[field] !== undefined) {
      output[field] = parser(body[field]);
    }
  }

  read('name', value =>
    requiredText(value, 'name', 100)
  );

  read('slug', parseSlug);

  read('description', value =>
    requiredText(value, 'description', 500)
  );

  if (body.imageUrl !== undefined || !partial) {
    const imageUrl = body.imageUrl || '';

    if (
      imageUrl &&
      (
        typeof imageUrl !== 'string' ||
        !imageUrl.startsWith('https://')
      )
    ) {
      throw validationError('Invalid imageUrl');
    }

    output.imageUrl = imageUrl.trim();
  }

  if (body.isFeatured !== undefined) {
    output.isFeatured = parseBoolean(
      body.isFeatured,
      'isFeatured'
    );
  }

  if (body.isActive !== undefined) {
    output.isActive = parseBoolean(
      body.isActive,
      'isActive'
    );
  }

  return output;
}

export const validateCreateCategory = validateBody(
  body => parseCategory(body)
);

export const validateUpdateCategory = validateBody(
  body => parseCategory(body, {partial: true})
);

export const validateCategoryId =
  validateObjectIdParam('id');

export function validateCategoryList(req, res, next) {
  try {
    allowOnly(req.query, ['featured']);

    req.validatedQuery = {
      featured: parseFeatured(req.query.featured)
    };

    next();
  } catch (error) {
    next(error);
  }
}