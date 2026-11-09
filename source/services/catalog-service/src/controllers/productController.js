import {sendSuccess} from '@store/http-response';
import {ProductRequestDTO} from '../dto/request/ProductRequestDTO.js';

export function createProductController({
  productService
}) {
  return {
    async list(req, res, next) {
      try {
        const result =
          await productService.listPublic(
            req.validatedQuery
          );

        sendSuccess(res, {
          message: 'Products retrieved successfully',
          data: result
        });
      } catch (error) {
        next(error);
      }
    },

    async detail(req, res, next) {
      try {
        const data =
          await productService.getPublicBySlug(
            req.params.slug
          );

        sendSuccess(res, {
          message: 'Product retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async filters(req, res, next) {
      try {
        const data =
          await productService.getPublicFilters();

        sendSuccess(res, {
          message: 'Product filters retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async adminList(req, res, next) {
      try {
        const result =
          await productService.listAdmin(
            req.validatedQuery
          );

        sendSuccess(res, {
          message: 'Admin products retrieved successfully',
          data: result
        });
      } catch (error) {
        next(error);
      }
    },

    async adminDetail(req, res, next) {
      try {
        const data =
          await productService.getAdminById(
            req.params.id
          );

        sendSuccess(res, {
          message: 'Admin product retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await productService.create({
          input: ProductRequestDTO.fromCreate(req.body),
          correlationId: req.context.requestId
        });

        sendSuccess(res, {
          status: 201,
          message: 'Product created successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await productService.update({
          productId: req.params.id,
          input: ProductRequestDTO.fromUpdate(req.body),
          correlationId: req.context.requestId
        });

        sendSuccess(res, {
          message: 'Product updated successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async deactivate(req, res, next) {
      try {
        const data =
          await productService.deactivate({
            productId: req.params.id,
            correlationId: req.context.requestId
          });

        sendSuccess(res, {
          message: 'Product deactivated successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async quote(req, res, next) {
      try {
        const {items: inputItems} =
          ProductRequestDTO.fromQuote(req.body);
        const items = await productService.quote(inputItems);

        sendSuccess(res, {
          message: 'Product quote created successfully',
          data: {items}
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
