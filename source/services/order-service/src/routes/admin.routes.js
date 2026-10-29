import {Router} from 'express';
import {AppError} from '@store/validation';

import {
  validateAdminCouponList,
  validateAdminId,
  validateAdminOrderList,
  validateAdminOrderStatus,
  validateCreateCoupon
} from '../validations/admin.validation.js';

function requireAdmin(req, res, next) {
  if (!req.context?.userId) {
    next(
      new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required'
      )
    );
    return;
  }

  if (req.context.role !== 'ADMIN') {
    next(
      new AppError(
        403,
        'FORBIDDEN',
        'Administrator access required'
      )
    );
    return;
  }

  next();
}

export function createAdminRouter(controller) {
  const router = Router();

  router.use('/api/v1/admin', requireAdmin);

  router.get(
    '/api/v1/admin/orders',
    validateAdminOrderList,
    controller.listOrders
  );

  router.get(
    '/api/v1/admin/orders/:id',
    validateAdminId,
    controller.orderDetail
  );

  router.patch(
    '/api/v1/admin/orders/:id/status',
    validateAdminId,
    validateAdminOrderStatus,
    controller.updateOrderStatus
  );

  router.get(
    '/api/v1/admin/coupons',
    validateAdminCouponList,
    controller.listCoupons
  );

  router.post(
    '/api/v1/admin/coupons',
    validateCreateCoupon,
    controller.createCoupon
  );

  return router;
}
