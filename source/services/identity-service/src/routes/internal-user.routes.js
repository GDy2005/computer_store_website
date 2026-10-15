import {Router} from 'express';
import mongoose from 'mongoose';
import {AppError} from '@store/validation';

export function createInternalUserRouter(controller) {
  const router = Router();

  router.get(
    '/internal/users/:id/summary',
    (req, res, next) => {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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