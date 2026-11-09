import {Router} from 'express';

import {
  validateCommentBody,
  validateCommentId,
  validateCommentList,
  validateCommentProductId,
  validateCommentReaction
} from '../validations/commentValidation.js';
import {rejectRole, requireRole} from '../middlewares/requireUser.js';

export function createCommentRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/products/:id/comments',
    validateCommentProductId,
    validateCommentList,
    controller.list
  );

  router.post(
    '/api/v1/products/:id/comments',
    rejectRole('ADMIN'),
    validateCommentProductId,
    validateCommentBody,
    controller.create
  );

  router.put(
    '/api/v1/products/:id/comments/:commentId/reaction',
    requireRole('CUSTOMER'),
    validateCommentProductId,
    validateCommentId,
    validateCommentReaction,
    controller.react
  );

  return router;
}
