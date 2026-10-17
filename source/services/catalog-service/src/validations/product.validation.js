import {
  allowOnly,
  assertObject,
  parseBoolean,
  parseInteger,
  parseObjectId,
  parseQueryInteger,
  requiredText,
  validateBody,
  validateObjectIdParam,
  validationError
} from './helpers.js';

const productFields = [
  'name',
  'slug',
  'brand',
  'categoryId',
  'tags',
  'shortDescription',
  'description',
  'images',
  'variants',
  'isActive'
];

const variantFields = [
  'sku',
  'name',
  'attributes',
  'price',
  'costPrice',
  'stock',
  'isActive'
];

function parseSlug(value) {
  const slug = requiredText(value, 'slug', 200)
    .toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw validationError('Invalid slug');
  }

  return slug;
}

function parseTags(value) {
  if (!Array.isArray(value) || value.length > 20) {
    throw validationError('Invalid tags');
  }

  return [
    ...new Set(
      value.map(item =>
        requiredText(item, 'tag', 50).toLowerCase()
      )
    )
  ];
}

function parseImage(value) {
  assertObject(value, 'Image must be an object');
  allowOnly(value, ['url', 'publicId', 'alt']);

  const url = requiredText(value.url, 'image.url', 1000);

  if (!url.startsWith('https://')) {
    throw validationError('Image URL must use HTTPS');
  }

  return {
    url,
    publicId: requiredText(
      value.publicId,
      'image.publicId',
      255
    ),
    alt: requiredText(value.alt, 'image.alt', 200)
  };
}

function parseImages(value) {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.length > 10
  ) {
    throw validationError(
      'Product requires between 3 and 10 images'
    );
  }

  return value.map(parseImage);
}

function parseAttributes(value) {
  assertObject(value, 'attributes must be an object');

  const entries = Object.entries(value);

  if (entries.length > 20) {
    throw validationError('Too many variant attributes');
  }

  return Object.fromEntries(
    entries.map(([key, item]) => [
      requiredText(key, 'attribute key', 50),
      requiredText(item, 'attribute value', 100)
    ])
  );
}

function parseVariant(value) {
  assertObject(value, 'Variant must be an object');
  allowOnly(value, variantFields);

  return {
    sku: requiredText(value.sku, 'variant.sku', 100)
      .toUpperCase(),
    name: requiredText(
      value.name,
      'variant.name',
      150
    ),
    attributes: parseAttributes(
      value.attributes || {}
    ),
    price: parseInteger(
      value.price,
      'variant.price'
    ),
    costPrice: parseInteger(
      value.costPrice,
      'variant.costPrice'
    ),
    stock: parseInteger(
      value.stock,
      'variant.stock'
    ),
    isActive:
      value.isActive === undefined
        ? true
        : parseBoolean(
            value.isActive,
            'variant.isActive'
          )
  };
}

function parseVariants(value) {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    value.length > 30
  ) {
    throw validationError(
      'Product requires between 2 and 30 variants'
    );
  }

  const variants = value.map(parseVariant);
  const skus = variants.map(item => item.sku);

  if (new Set(skus).size !== skus.length) {
    throw validationError(
      'Variant SKU must be unique'
    );
  }

  return variants;
}

function parseProduct(body, {partial = false} = {}) {
  assertObject(body);
  allowOnly(body, productFields);

  if (partial && Object.keys(body).length === 0) {
    throw validationError(
      'At least one product field is required'
    );
  }

  const output = {};

  function read(field, parser) {
    if (!partial || body[field] !== undefined) {
      output[field] = parser(body[field]);
    }
  }

  read('name', value =>
    requiredText(value, 'name', 200)
  );

  read('slug', parseSlug);

  read('brand', value =>
    requiredText(value, 'brand', 100)
  );

  read('categoryId', value =>
    parseObjectId(value, 'categoryId')
  );

  if (!partial || body.tags !== undefined) {
    output.tags = parseTags(body.tags || []);
  }

  read('shortDescription', value =>
    requiredText(value, 'shortDescription', 300)
  );

  read('description', value =>
    requiredText(value, 'description', 5000)
  );

  read('images', parseImages);
  read('variants', parseVariants);

  if (body.isActive !== undefined) {
    output.isActive = parseBoolean(
      body.isActive,
      'isActive'
    );
  }

  return output;
}

export const validateCreateProduct = validateBody(
  body => parseProduct(body)
);

export const validateUpdateProduct = validateBody(
  body => parseProduct(body, {partial: true})
);

export const validateProductId =
  validateObjectIdParam('id');

export function validateProductSlug(req, res, next) {
  try {
    req.params.slug = parseSlug(req.params.slug);
    next();
  } catch (error) {
    next(error);
  }
}

const publicQueryFields = [
  'page',
  'limit',
  'search',
  'category',
  'brand',
  'minPrice',
  'maxPrice',
  'minRating',
  'sort'
];

export function validateProductList(req, res, next) {
  try {
    allowOnly(req.query, publicQueryFields);

    const minPrice = parseQueryInteger(
      req.query.minPrice,
      'minPrice'
    );

    const maxPrice = parseQueryInteger(
      req.query.maxPrice,
      'maxPrice'
    );

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw validationError(
        'minPrice cannot exceed maxPrice'
      );
    }

    const sort = req.query.sort || 'newest';
    const acceptedSorts = [
      'name_asc',
      'name_desc',
      'price_asc',
      'price_desc',
      'newest',
      'best_selling'
    ];

    if (!acceptedSorts.includes(sort)) {
      throw validationError('Invalid sort');
    }

    req.validatedQuery = {
      page: parseQueryInteger(
        req.query.page,
        'page',
        {minimum: 1}
      ) || 1,
      limit: parseQueryInteger(
        req.query.limit,
        'limit',
        {minimum: 1, maximum: 50}
      ) || 12,
      search:
        req.query.search === undefined
          ? undefined
          : requiredText(
              req.query.search,
              'search',
              100
            ),
      category:
        req.query.category === undefined
          ? undefined
          : requiredText(
              req.query.category,
              'category',
              200
            ).toLowerCase(),
      brand:
        req.query.brand === undefined
          ? undefined
          : requiredText(
              req.query.brand,
              'brand',
              100
            ),
      minPrice,
      maxPrice,
      minRating: parseQueryInteger(
        req.query.minRating,
        'minRating',
        {minimum: 0, maximum: 5}
      ),
      sort
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function validateAdminProductList(req, res, next) {
  try {
    allowOnly(req.query, [
      'page',
      'limit',
      'search',
      'isActive'
    ]);

    let isActive;

    if (req.query.isActive !== undefined) {
      if (!['true', 'false'].includes(req.query.isActive)) {
        throw validationError('Invalid isActive');
      }

      isActive = req.query.isActive === 'true';
    }

    req.validatedQuery = {
      page: parseQueryInteger(
        req.query.page,
        'page',
        {minimum: 1}
      ) || 1,
      limit: parseQueryInteger(
        req.query.limit,
        'limit',
        {minimum: 1, maximum: 50}
      ) || 20,
      search:
        req.query.search === undefined
          ? undefined
          : requiredText(
              req.query.search,
              'search',
              100
            ),
      isActive
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function validateInternalQuote(req, res, next) {
  try {
    if (
      !req.body ||
      !Array.isArray(req.body.items) ||
      req.body.items.length < 1 ||
      req.body.items.length > 50
    ) {
      throw validationError('Invalid quote items');
    }

    req.body = {
      items: req.body.items.map(item => {
        assertObject(item);
        allowOnly(item, [
          'productId',
          'variantId',
          'quantity'
        ]);

        return {
          productId: parseObjectId(
            item.productId,
            'productId'
          ),
          variantId: parseObjectId(
            item.variantId,
            'variantId'
          ),
          quantity: parseInteger(
            item.quantity,
            'quantity',
            {minimum: 1, maximum: 99}
          )
        };
      })
    };

    next();
  } catch (error) {
    next(error);
  }
}