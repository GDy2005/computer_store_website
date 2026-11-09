import express from 'express';

import {
  createCatalogClient
} from './clients/catalogClient.js';

import {
  createIdentityClient
} from './clients/identityClient.js';

import {
  createCartService
} from './services/cartService.js';

import {
  createCouponService
} from './services/couponService.js';

import {
  createCheckoutService
} from './services/checkoutService.js';
import {createCustomerOrderService} from './services/customerOrderService.js';
import {createLoyaltyService} from './services/loyaltyService.js';
import {createOrderStatusService} from './services/orderStatusService.js';
import {createAdminOrderService} from './services/adminOrderService.js';
import {createAdminCouponService} from './services/adminCouponService.js';
import {createPaymentService} from './services/paymentService.js';
import {createCartRepository} from './repositories/cartRepository.js';
import {createOrderRepository} from './repositories/orderRepository.js';
import {createCouponRepository} from './repositories/couponRepository.js';
import {createLoyaltyRepository} from './repositories/loyaltyRepository.js';

import {
  createOrderController
} from './controllers/orderController.js';

import {
  createOrderRouter
} from './routes/orderRoutes.js';

import {
  createAdminController
} from './controllers/adminController.js';

import {
  createAdminRouter
} from './routes/adminRoutes.js';

export function buildApp({
  connection,
  models
}) {
  const router = express.Router();

  const catalogClient = createCatalogClient({
    baseUrl:
      process.env.CATALOG_SERVICE_URL ||
      'http://catalog-service:5002',
    secret: process.env.INTERNAL_SERVICE_SECRET
  });

  const identityClient = createIdentityClient({
    baseUrl:
      process.env.IDENTITY_SERVICE_URL ||
      'http://identity-service:5001',
    secret: process.env.INTERNAL_SERVICE_SECRET
  });

  const cartRepository = createCartRepository({Cart: models.Cart});
  const orderRepository = createOrderRepository({Order: models.Order});
  const couponRepository = createCouponRepository({Coupon: models.Coupon});
  const loyaltyRepository = createLoyaltyRepository({
    LoyaltyAccount: models.LoyaltyAccount,
    LoyaltyTransaction: models.LoyaltyTransaction
  });

  const cartService = createCartService({
    connection,
    cartRepository,
    catalogClient
  });

  const couponService = createCouponService({
    couponRepository
  });

  const loyaltyService = createLoyaltyService({
    loyaltyRepository
  });

  const checkoutService =
    createCheckoutService({
      connection,
      orderRepository,
      Outbox: models.Outbox,
      cartService,
      couponService,
      loyaltyService,
      identityClient
    });

  const paymentService = createPaymentService();

  const customerOrderService = createCustomerOrderService({
    orderRepository
  });

  const orderStatusService = createOrderStatusService({
    connection,
    orderRepository,
    couponRepository,
    Outbox: models.Outbox,
    loyaltyService
  });

  const adminOrderService = createAdminOrderService({
    orderRepository
  });

  const adminCouponService = createAdminCouponService({
    couponRepository,
    orderRepository
  });

  const controller = createOrderController({
    cartService,
    couponService,
    checkoutService,
    paymentService,
    customerOrderService,
    loyaltyService
  });

  router.use(createOrderRouter(controller));

  router.use(
    createAdminRouter(
      createAdminController({
        adminOrderService,
        adminCouponService,
        orderStatusService
      })
    )
  );

  return router;
}
