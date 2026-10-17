import {Router} from 'express';
import mongoose from 'mongoose';
import {AppError} from '@store/validation';

import {
  validateResolveCheckout
} from '../validations/checkout.validation.js';

export function createInternalUserRouter(controller) {
  const router = Router();

  router.post(
    '/internal/users/resolve-checkout',
    validateResolveCheckout,
    controller.resolveCheckout
  );

  router.get(
    '/internal/users/:id/summary',
    (req, res, next) => {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return next(
          new AppError(
            400,
            'VALIDATION_ERROR',
            'Invalid user ID'
          )
        );
      }

      next();
    },
    controller.getSummary
  );

  return router;
}
