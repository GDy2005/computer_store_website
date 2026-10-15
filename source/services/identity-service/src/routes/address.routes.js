import {Router} from 'express';

import {
  requireUser
} from '../middlewares/require-user.js';

import {
  validateAddressId,
  validateCreateAddress,
  validateUpdateAddress
} from '../validations/address.validation.js';

export function createAddressRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/users/me/addresses',
    requireUser,
    controller.list
  );

  router.post(
    '/api/v1/users/me/addresses',
    requireUser,
    validateCreateAddress,
    controller.create
  );

  router.patch(
    '/api/v1/users/me/addresses/:id',
    requireUser,
    validateAddressId,
    validateUpdateAddress,
    controller.update
  );

  router.delete(
    '/api/v1/users/me/addresses/:id',
    requireUser,
    validateAddressId,
    controller.remove
  );

  router.patch(
    '/api/v1/users/me/addresses/:id/default',
    requireUser,
    validateAddressId,
    controller.setDefault
  );

  return router;
}