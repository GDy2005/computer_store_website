import {Router} from 'express';

import {
  validateProductList,
  validateProductSlug
} from '../validations/product.validation.js';

export function createProductRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/products',
    validateProductList,
    controller.list
  );

  router.get(
    '/api/v1/products/filters',
    controller.filters
  );

  router.get(
    '/api/v1/products/:slug',
    validateProductSlug,
    controller.detail
  );

  return router;
}
