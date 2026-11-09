import {AppError} from '@store/validation';
import {
  createCategoryRepository
} from '../repositories/categoryRepository.js';

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
  categoryRepository: injectedCategoryRepository,
  Category,
  Product
}) {
  const categoryRepository = injectedCategoryRepository ||
    createCategoryRepository({Category, Product});
  return {
    list({featured} = {}) {
      return categoryRepository.findActive({featured});
    },

    listAdmin() {
      return categoryRepository.findAll();
    },

    async create(input) {
      try {
        return await categoryRepository.create(input);
      } catch (error) {
        throw duplicateCategory(error);
      }
    },

    async update(categoryId, input) {
      try {
        const category = await categoryRepository.updateById(
          categoryId,
          input
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
      const activeProducts =
        await categoryRepository.countActiveProducts(categoryId);

      if (activeProducts > 0) {
        throw new AppError(
          409,
          'CATEGORY_IN_USE',
          'Category still contains active products'
        );
      }

      const category =
        await categoryRepository.deactivateById(categoryId);

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
