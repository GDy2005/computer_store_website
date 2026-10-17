import {Router} from 'express';

import {
  validateInternalQuote,
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

  router.post(
    '/internal/catalog/quote',
    validateInternalQuote,
    controller.quote
  );

  router.get(
    '/api/v1/products/:slug',
    validateProductSlug,
    controller.detail
  );

  return router;
}
