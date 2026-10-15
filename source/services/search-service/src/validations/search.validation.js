import {AppError} from '@store/validation';

const acceptedFields = new Set([
  'page',
  'limit',
  'search',
  'category',
  'brand',
  'minPrice',
  'maxPrice',
  'minRating',
  'sort'
]);

const acceptedSorts = new Set([
  'name_asc',
  'name_desc',
  'price_asc',
  'price_desc',
  'newest',
  'best_selling'
]);

function invalid(message) {
  return new AppError(400, 'VALIDATION_ERROR', message);
}

function integer(value, field, {minimum = 0, maximum} = {}) {
  if (value === undefined) return undefined;
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    (maximum !== undefined && parsed > maximum)
  ) {
    throw invalid(`Invalid ${field}`);
  }

  return parsed;
}

function text(value, field, maximum) {
  if (value === undefined) return undefined;
  const parsed = String(value).trim();

  if (!parsed || parsed.length > maximum) {
    throw invalid(`Invalid ${field}`);
  }

  return parsed;
}

export function validateSearch(req, res, next) {
  try {
    for (const field of Object.keys(req.query)) {
      if (!acceptedFields.has(field)) {
        throw invalid(`Unsupported query field: ${field}`);
      }
    }

    const minPrice = integer(req.query.minPrice, 'minPrice');
    const maxPrice = integer(req.query.maxPrice, 'maxPrice');

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw invalid('minPrice cannot exceed maxPrice');
    }

    const sort = req.query.sort || 'newest';
    if (!acceptedSorts.has(sort)) throw invalid('Invalid sort');

    req.validatedQuery = {
      page: integer(req.query.page, 'page', {minimum: 1}) || 1,
      limit: integer(req.query.limit, 'limit', {minimum: 1, maximum: 50}) || 12,
      search: text(req.query.search, 'search', 100),
      category: text(req.query.category, 'category', 200)?.toLowerCase(),
      brand: text(req.query.brand, 'brand', 100),
      minPrice,
      maxPrice,
      minRating: integer(req.query.minRating, 'minRating', {maximum: 5}),
      sort
    };
    next();
  } catch (error) {
    next(error);
  }
}
