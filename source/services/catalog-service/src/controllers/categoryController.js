import {sendSuccess} from '@store/http-response';
import {CategoryRequestDTO} from '../dto/request/CategoryRequestDTO.js';

export function createCategoryController({
  categoryService
}) {
  return {
    async list(req, res, next) {
      try {
        const items = await categoryService.list(
          req.validatedQuery
        );

        sendSuccess(res, {
          message: 'Categories retrieved successfully',
          data: {items}
        });
      } catch (error) {
        next(error);
      }
    },

    async adminList(req, res, next) {
      try {
        const items =
          await categoryService.listAdmin();

        sendSuccess(res, {
          message: 'Admin categories retrieved successfully',
          data: {items}
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await categoryService.create(
          CategoryRequestDTO.from(req.body)
        );

        sendSuccess(res, {
          status: 201,
          message: 'Category created successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await categoryService.update(
          req.params.id,
          CategoryRequestDTO.from(req.body)
        );

        sendSuccess(res, {
          message: 'Category updated successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async deactivate(req, res, next) {
      try {
        const data =
          await categoryService.deactivate(
            req.params.id
          );

        sendSuccess(res, {
          message: 'Category deactivated successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
