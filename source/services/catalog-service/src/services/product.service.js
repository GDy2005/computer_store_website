import {AppError} from '@store/validation';

import {
  enqueueProductCreated,
  enqueueProductUpdated
} from '../events/catalog-events.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function duplicateProduct(error) {
  if (error.code === 11000) {
    return new AppError(
      409,
      'PRODUCT_CONFLICT',
      'Product slug or variant SKU already exists'
    );
  }

  return error;
}

function publicProduct(value) {
  const product =
    typeof value.toObject === 'function'
      ? value.toObject({flattenMaps: true})
      : value;

  const variants = product.variants
    .filter(variant => variant.isActive)
    .map(variant => {
      const publicVariant = {...variant};
      const reservedStock =
        publicVariant.reservedStock || 0;

      delete publicVariant.costPrice;
      delete publicVariant.reservedStock;

      return {
        ...publicVariant,
        availableStock: Math.max(
          0,
          publicVariant.stock - reservedStock
        )
      };
    });

  return {...product, variants};
}

function mergeVariants(currentVariants, nextVariants) {
  const currentBySku = new Map(
    currentVariants.map(variant => [
      variant.sku,
      variant
    ])
  );

  const nextSkus = new Set(
    nextVariants.map(variant => variant.sku)
  );

  const reservedVariant = currentVariants.find(
    variant =>
      variant.reservedStock > 0 &&
      !nextSkus.has(variant.sku)
  );

  if (reservedVariant) {
    throw new AppError(
      409,
      'VARIANT_RESERVED',
      `Variant ${reservedVariant.sku} has reserved stock`
    );
  }

  return nextVariants.map(variant => {
    const current = currentBySku.get(variant.sku);

    if (!current) return variant;

    return {
      ...variant,
      _id: current._id,
      reservedStock: current.reservedStock
    };
  });
}

function sortDefinition(sort) {
  return {
    name_asc: {name: 1},
    name_desc: {name: -1},
    price_asc: {minPrice: 1, name: 1},
    price_desc: {maxPrice: -1, name: 1},
    newest: {createdAt: -1},
    best_selling: {soldCount: -1, createdAt: -1}
  }[sort];
}

export function createProductService({
  connection,
  Product,
  Category,
  Outbox
}) {
  async function requireActiveCategory(
    categoryId,
    session
  ) {
    const category = await Category.findOne({
      _id: categoryId,
      isActive: true
    }).session(session || null);

    if (!category) {
      throw new AppError(
        400,
        'CATEGORY_INVALID',
        'Category does not exist or is inactive'
      );
    }

    return category;
  }

  async function listPublic(query) {
    const filter = {isActive: true};

    if (query.category) {
      const category = await Category.findOne({
        slug: query.category,
        isActive: true
      }).select('_id');

      if (!category) {
        return {
          items: [],
          meta: {
            page: query.page,
            limit: query.limit,
            totalItems: 0,
            totalPages: 1
          }
        };
      }

      filter.categoryId = category._id;
    }

    if (query.brand) {
      filter.brand = new RegExp(
        `^${escapeRegex(query.brand)}$`,
        'i'
      );
    }

    if (query.search) {
      const search = new RegExp(
        escapeRegex(query.search),
        'i'
      );

      filter.$or = [
        {name: search},
        {brand: search},
        {tags: search},
        {shortDescription: search}
      ];
    }

    if (query.minPrice !== undefined) {
      filter.maxPrice = {$gte: query.minPrice};
    }

    if (query.maxPrice !== undefined) {
      filter.minPrice = {$lte: query.maxPrice};
    }

    if (query.minRating !== undefined) {
      filter.averageRating = {
        $gte: query.minRating
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [documents, totalItems] =
      await Promise.all([
        Product.find(filter)
          .populate('categoryId', 'name slug')
          .sort(sortDefinition(query.sort))
          .skip(skip)
          .limit(query.limit)
          .lean({flattenMaps: true}),
        Product.countDocuments(filter)
      ]);

    return {
      items: documents.map(publicProduct),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / query.limit)
        )
      }
    };
  }

  async function getPublicBySlug(slug) {
    const product = await Product.findOne({
      slug,
      isActive: true
    })
      .populate('categoryId', 'name slug')
      .lean({flattenMaps: true});

    if (!product) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Product not found'
      );
    }

    return publicProduct(product);
  }

  async function getPublicFilters() {
    const [categories, brands, priceRanges] =
      await Promise.all([
        Category.find({isActive: true})
          .select('name slug')
          .sort({name: 1})
          .lean(),
        Product.distinct('brand', {isActive: true}),
        Product.aggregate([
          {$match: {isActive: true}},
          {
            $group: {
              _id: null,
              minPrice: {$min: '$minPrice'},
              maxPrice: {$max: '$maxPrice'}
            }
          }
        ])
      ]);

    const range = priceRanges[0] || {};

    return {
      categories,
      brands: brands.sort((left, right) =>
        left.localeCompare(right)
      ),
      priceRange: {
        min: range.minPrice || 0,
        max: range.maxPrice || 0
      }
    };
  }

  async function listAdmin(query) {
    const filter = {};

    if (typeof query.isActive === 'boolean') {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      const search = new RegExp(
        escapeRegex(query.search),
        'i'
      );

      filter.$or = [
        {name: search},
        {slug: search},
        {brand: search},
        {'variants.sku': search}
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, totalItems] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .sort({createdAt: -1})
        .skip(skip)
        .limit(query.limit)
        .lean({flattenMaps: true}),
      Product.countDocuments(filter)
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / query.limit)
        )
      }
    };
  }

  async function getAdminById(productId) {
    const product = await Product.findById(productId)
      .populate('categoryId', 'name slug')
      .lean({flattenMaps: true});

    if (!product) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Product not found'
      );
    }

    return product;
  }

  async function create({
    input,
    correlationId
  }) {
    try {
      return await connection.transaction(
        async session => {
          await requireActiveCategory(
            input.categoryId,
            session
          );

          const [product] = await Product.create(
            [input],
            {session}
          );

          await enqueueProductCreated({
            Outbox,
            product,
            correlationId,
            session
          });

          return product.toObject({
            flattenMaps: true
          });
        }
      );
    } catch (error) {
      throw duplicateProduct(error);
    }
  }

  async function update({
    productId,
    input,
    correlationId
  }) {
    try {
      return await connection.transaction(
        async session => {
          const product = await Product.findById(
            productId
          ).session(session);

          if (!product) {
            throw new AppError(
              404,
              'NOT_FOUND',
              'Product not found'
            );
          }

          if (input.categoryId !== undefined) {
            await requireActiveCategory(
              input.categoryId,
              session
            );
          }

          const changes = {...input};

          if (input.variants !== undefined) {
            changes.variants = mergeVariants(
              product.variants,
              input.variants
            );
          }

          Object.assign(product, changes);
          await product.save({session});

          await enqueueProductUpdated({
            Outbox,
            product,
            correlationId,
            session
          });

          return product.toObject({
            flattenMaps: true
          });
        }
      );
    } catch (error) {
      throw duplicateProduct(error);
    }
  }

  async function deactivate({
    productId,
    correlationId
  }) {
    return connection.transaction(async session => {
      const product = await Product.findById(
        productId
      ).session(session);

      if (!product) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Product not found'
        );
      }

      product.isActive = false;
      await product.save({session});

      await enqueueProductUpdated({
        Outbox,
        product,
        correlationId,
        session
      });

      return {deactivated: true};
    });
  }

  return {
    listPublic,
    getPublicBySlug,
    getPublicFilters,
    listAdmin,
    getAdminById,
    create,
    update,
    deactivate
  };
}
