import express from 'express';

import {
  createCatalogClient
} from './clients/catalog-client.service.js';

import {
  createIdentityClient
} from './clients/identity-client.service.js';

import {
  createCartService
} from './services/cart.service.js';

import {
  createCouponService
} from './services/coupon.service.js';

import {
  createCheckoutService
} from './services/checkout.service.js';
import {createCustomerOrderService} from './services/customer-order.service.js';
import {createLoyaltyService} from './services/loyalty.service.js';
import {createOrderStatusService} from './services/order-status.service.js';

import {
  createOrderController
} from './controllers/order.controller.js';

import {
  createOrderRouter
} from './routes/order.routes.js';

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

  const cartService = createCartService({
    connection,
    Cart: models.Cart,
    catalogClient
  });

  const couponService = createCouponService({
    Coupon: models.Coupon
  });

  const loyaltyService = createLoyaltyService({
    LoyaltyAccount: models.LoyaltyAccount,
    LoyaltyTransaction: models.LoyaltyTransaction
  });

  const checkoutService =
    createCheckoutService({
      connection,
      Cart: models.Cart,
      Order: models.Order,
      Outbox: models.Outbox,
      cartService,
      couponService,
      loyaltyService,
      identityClient
    });

  const customerOrderService = createCustomerOrderService({
    Order: models.Order
  });

  const orderStatusService = createOrderStatusService({
    connection,
    Order: models.Order,
    Coupon: models.Coupon,
    Outbox: models.Outbox,
    loyaltyService
  });

  const controller = createOrderController({
    cartService,
    couponService,
    checkoutService,
    customerOrderService,
    loyaltyService,
    orderStatusService
  });

  router.use(createOrderRouter(controller));

  return router;
}
