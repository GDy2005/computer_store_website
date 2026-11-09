function withSession(query, session) {
  if (session && typeof query?.session === 'function') {
    return query.session(session);
  }

  return query;
}

export function createCategoryRepository({Category, Product}) {
  return {
    findActive({featured} = {}) {
      const filter = {isActive: true};

      if (typeof featured === 'boolean') {
        filter.isFeatured = featured;
      }

      return Category.find(filter)
        .select('name slug description imageUrl isFeatured')
        .sort({name: 1})
        .lean();
    },

    findAll() {
      return Category.find().sort({name: 1}).lean();
    },

    findActiveById(categoryId, session = null) {
      return withSession(
        Category.findOne({
          _id: categoryId,
          isActive: true
        }),
        session
      );
    },

    findActiveBySlug(slug) {
      return Category.findOne({
        slug,
        isActive: true
      }).select('_id');
    },

    findPublicActive() {
      return Category.find({isActive: true})
        .select('name slug')
        .sort({name: 1})
        .lean();
    },

    create(input) {
      return Category.create(input);
    },

    updateById(categoryId, changes) {
      return Category.findByIdAndUpdate(
        categoryId,
        {$set: changes},
        {new: true, runValidators: true}
      );
    },

    deactivateById(categoryId) {
      return Category.findByIdAndUpdate(
        categoryId,
        {$set: {isActive: false}},
        {new: true}
      );
    },

    countActiveProducts(categoryId) {
      return Product.countDocuments({
        categoryId,
        isActive: true
      });
    }
  };
}
