import {Router} from 'express';

import {
  requireRole
} from '../middlewares/requireUser.js';

import {
  validateAddressId,
  validateCreateAddress,
  validateUpdateAddress
} from '../validations/addressValidation.js';

export function createAddressRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/users/me/addresses',
    requireRole('CUSTOMER'),
    controller.list
  );

  router.post(
    '/api/v1/users/me/addresses',
    requireRole('CUSTOMER'),
    validateCreateAddress,
    controller.create
  );

  router.patch(
    '/api/v1/users/me/addresses/:id',
    requireRole('CUSTOMER'),
    validateAddressId,
    validateUpdateAddress,
    controller.update
  );

  router.delete(
    '/api/v1/users/me/addresses/:id',
    requireRole('CUSTOMER'),
    validateAddressId,
    controller.remove
  );

  router.patch(
    '/api/v1/users/me/addresses/:id/default',
    requireRole('CUSTOMER'),
    validateAddressId,
    controller.setDefault
  );

  return router;
}
