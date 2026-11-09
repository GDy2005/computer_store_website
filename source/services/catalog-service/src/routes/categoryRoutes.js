import {Router} from 'express';

import {
  validateCategoryList
} from '../validations/categoryValidation.js';

export function createCategoryRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/categories',
    validateCategoryList,
    controller.list
  );

  return router;
}