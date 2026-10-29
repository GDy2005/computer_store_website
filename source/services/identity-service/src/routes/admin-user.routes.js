import {Router} from 'express';

import {
  requireRole
} from '../middlewares/require-user.js';

import {
  validateAdminUserBan,
  validateAdminUserId,
  validateAdminUserList,
  validateAdminUserUpdate
} from '../validations/admin-user.validation.js';

export function createAdminUserRouter(controller) {
  const router = Router();

  router.use(
    '/api/v1/admin/users',
    requireRole('ADMIN')
  );

  router.get(
    '/api/v1/admin/users',
    validateAdminUserList,
    controller.list
  );

  router.patch(
    '/api/v1/admin/users/:id/ban',
    validateAdminUserId,
    validateAdminUserBan,
    controller.setBan
  );

  router.patch(
    '/api/v1/admin/users/:id',
    validateAdminUserId,
    validateAdminUserUpdate,
    controller.update
  );

  return router;
}
