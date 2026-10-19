import {Router} from 'express';
import mongoose from 'mongoose';
import {AppError} from '@store/validation';

import {
  identifyCartOwner
} from '../middlewares/cart-owner.js';

import {
  validateAddItem,
  validateCoupon,
  validatePlaceOrder,
  validatePreview,
  validateQuantity,
  validateOrderListQuery,
  validateOrderStatus
} from '../validations/order.validation.js';

function validateVariantId(req, res, next) {
  if (
    !mongoose.Types.ObjectId.isValid(
      req.params.variantId
    )
  ) {
    next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid variantId'
      )
    );
    return;
  }

  next();
}

function requireUser(req, res, next) {
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

  next();
}

function requireAdmin(req, res, next) {
  if (!req.context?.userId) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }
  if (req.context.role !== 'ADMIN') {
    next(new AppError(403, 'FORBIDDEN', 'Administrator access required'));
    return;
  }
  next();
}

function validateOrderId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    next(new AppError(400, 'VALIDATION_ERROR', 'Invalid order ID'));
    return;
  }
  next();
}

function validateOrderNumber(req, res, next) {
  if (!/^ORD-\d{8}-[A-F0-9]{6}$/.test(req.params.orderNumber)) {
    next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid order number'
      )
    );
    return;
  }

  next();
}

export function createOrderRouter(controller) {
  const router = Router();

  router.use([
    '/api/v1/cart',
    '/api/v1/coupons',
    '/api/v1/checkout',
    '/api/v1/orders',
    '/api/v1/loyalty'
  ], identifyCartOwner);

  router.get(
    '/api/v1/cart',
    controller.getCart
  );

  router.post(
    '/api/v1/cart/items',
    validateAddItem,
    controller.addItem
  );

  router.patch(
    '/api/v1/cart/items/:variantId',
    validateVariantId,
    validateQuantity,
    controller.updateItem
  );

  router.delete(
    '/api/v1/cart/items/:variantId',
    validateVariantId,
    controller.removeItem
  );

  router.delete(
    '/api/v1/cart',
    controller.clearCart
  );

  router.post(
    '/api/v1/cart/merge',
    requireUser,
    controller.mergeCart
  );

  router.post(
    '/api/v1/coupons/validate',
    validateCoupon,
    controller.validateCoupon
  );

  router.post(
    '/api/v1/checkout/preview',
    validatePreview,
    controller.preview
  );

  router.post(
    '/api/v1/checkout/place-order',
    validatePlaceOrder,
    controller.place
  );

  router.get(
    '/api/v1/loyalty/me',
    requireUser,
    validateOrderListQuery,
    controller.loyaltySummary
  );

  router.patch(
    '/api/v1/admin/orders/:id/status',
    requireAdmin,
    validateOrderId,
    validateOrderStatus,
    controller.updateOrderStatus
  );

  router.get(
    '/api/v1/orders/me',
    requireUser,
    validateOrderListQuery,
    controller.listMyOrders
  );

  router.get(
    '/api/v1/orders/me/:orderNumber',
    requireUser,
    validateOrderNumber,
    controller.myOrderDetail
  );

  router.get(
    '/api/v1/orders/:orderNumber/status',
    validateOrderNumber,
    controller.orderStatus
  );

  return router;
}
