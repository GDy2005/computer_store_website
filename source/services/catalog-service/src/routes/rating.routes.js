import {Router} from 'express';

import {requireUser} from '../middlewares/require-user.js';

import {
  validateRatingBody,
  validateRatingProductId
} from '../validations/rating.validation.js';

export function createRatingRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/products/:id/ratings',
    validateRatingProductId,
    controller.summary
  );

  router.put(
    '/api/v1/products/:id/rating',
    requireUser,
    validateRatingProductId,
    validateRatingBody,
    controller.upsert
  );

  return router;
}