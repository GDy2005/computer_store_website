import {AppError} from '@store/validation';

function duplicateCategory(error) {
  if (error.code === 11000) {
    return new AppError(
      409,
      'CATEGORY_ALREADY_EXISTS',
      'Category slug already exists'
    );
  }

  return error;
}

export function createCategoryService({
  Category,
  Product
}) {
  return {
    list({featured} = {}) {
      const filter = {isActive: true};

      if (typeof featured === 'boolean') {
        filter.isFeatured = featured;
      }

      return Category.find(filter)
        .select(
          'name slug description imageUrl isFeatured'
        )
        .sort({name: 1})
        .lean();
    },

    listAdmin() {
      return Category.find()
        .sort({name: 1})
        .lean();
    },

    async create(input) {
      try {
        return await Category.create(input);
      } catch (error) {
        throw duplicateCategory(error);
      }
    },

    async update(categoryId, input) {
      try {
        const category = await Category.findByIdAndUpdate(
          categoryId,
          {$set: input},
          {
            new: true,
            runValidators: true
          }
        );

        if (!category) {
          throw new AppError(
            404,
            'NOT_FOUND',
            'Category not found'
          );
        }

        return category;
      } catch (error) {
        throw duplicateCategory(error);
      }
    },

    async deactivate(categoryId) {
      const activeProducts = await Product.countDocuments({
        categoryId,
        isActive: true
      });

      if (activeProducts > 0) {
        throw new AppError(
          409,
          'CATEGORY_IN_USE',
          'Category still contains active products'
        );
      }

      const category = await Category.findByIdAndUpdate(
        categoryId,
        {$set: {isActive: false}},
        {new: true}
      );

      if (!category) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Category not found'
        );
      }

      return {deactivated: true};
    }
  };
}