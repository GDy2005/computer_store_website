function withSession(query, session) {
  if (session && typeof query?.session === 'function') {
    return query.session(session);
  }

  return query;
}

export function createProductRepository({Product}) {
  return {
    async listPublic({filter, sort, skip, limit}) {
      const [items, totalItems] = await Promise.all([
        Product.find(filter)
          .populate('categoryId', 'name slug')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean({flattenMaps: true}),
        Product.countDocuments(filter)
      ]);

      return {items, totalItems};
    },

    findPublicBySlug(slug) {
      return Product.findOne({slug, isActive: true})
        .populate('categoryId', 'name slug')
        .lean({flattenMaps: true});
    },

    aggregate(pipeline) {
      return Product.aggregate(pipeline);
    },

    async listAdmin({filter, skip, limit}) {
      const [items, totalItems] = await Promise.all([
        Product.find(filter)
          .populate('categoryId', 'name slug')
          .sort({createdAt: -1})
          .skip(skip)
          .limit(limit)
          .lean({flattenMaps: true}),
        Product.countDocuments(filter)
      ]);

      return {items, totalItems};
    },

    findAdminById(productId) {
      return Product.findById(productId)
        .populate('categoryId', 'name slug')
        .lean({flattenMaps: true});
    },

    async create(input, session) {
      const [product] = await Product.create([input], {session});
      return product;
    },

    findById(productId, session = null) {
      const query = typeof Product.findById === 'function'
        ? Product.findById(productId)
        : Product.findOne({_id: productId});

      return withSession(query, session);
    },

    save(product, session) {
      return product.save(session ? {session} : undefined);
    },

    findForQuote(productIds) {
      return Product.find({
        _id: {$in: productIds},
        isActive: true
      }).populate('categoryId', 'name');
    },

    existsActive(productId) {
      return Product.exists({_id: productId, isActive: true});
    },

    findRatingSummary(productId) {
      return Product.findOne({_id: productId, isActive: true})
        .select('averageRating ratingCount')
        .lean();
    },

    findManyByIds(productIds, session = null) {
      return withSession(
        Product.find({_id: {$in: productIds}}),
        session
      );
    },

    saveMany(products, session) {
      return Promise.all(
        products.map(product =>
          product.save(session ? {session} : undefined)
        )
      );
    }
  };
}
