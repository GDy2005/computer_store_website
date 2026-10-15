import {Router} from 'express';

import {
  requireUser
} from '../middlewares/require-user.js';

import {
  validateChangePassword
} from '../validations/auth.validation.js';

import {
  validateUpdateProfile
} from '../validations/user.validation.js';

export function createUserRouter(controller) {
  const router = Router();

  router.get(
    '/api/v1/users/me',
    requireUser,
    controller.getMe
  );

  router.patch(
    '/api/v1/users/me',
    requireUser,
    validateUpdateProfile,
    controller.updateMe
  );

  router.patch(
    '/api/v1/users/me/password',
    requireUser,
    validateChangePassword,
    controller.changePassword
  );

  return router;
}