import {Router} from 'express';

import {
  requireUser
} from '../middlewares/requireUser.js';

import {
  validateChangePassword
} from '../validations/authValidation.js';

import {
  validateUpdateProfile
} from '../validations/userValidation.js';
import {receiveAvatar} from '../middlewares/avatarUpload.js';

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

  router.put(
    '/api/v1/users/me/avatar',
    requireUser,
    receiveAvatar,
    controller.updateAvatar
  );

  return router;
}
