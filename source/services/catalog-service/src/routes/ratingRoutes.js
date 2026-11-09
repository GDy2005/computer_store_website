import {Router} from 'express';

import {requireRole} from '../middlewares/requireUser.js';

import {
  validateRatingBody,
  validateRatingProductId
} from '../validations/ratingValidation.js';

export function createRatingRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/products/:id/ratings',
    validateRatingProductId,
    controller.summary
  );

  router.put(
    '/api/v1/products/:id/rating',
    requireRole('CUSTOMER'),
    validateRatingProductId,
    validateRatingBody,
    controller.upsert
  );

  return router;
}
