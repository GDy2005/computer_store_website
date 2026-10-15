import {Router} from 'express';

import {
  validateCommentBody,
  validateCommentList,
  validateCommentProductId
} from '../validations/comment.validation.js';

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
    validateCommentProductId,
    validateCommentBody,
    controller.create
  );

  return router;
}