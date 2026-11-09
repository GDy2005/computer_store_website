import {
  registerOrderModels
} from './config/database.js';

import {
  createOrderWorkflowService
} from './services/orderWorkflowService.js';

import {
  createOrderWorkflowConsumers
} from './events/order-workflow.consumer.js';
import {createCheckoutTimeoutWorker} from './services/checkoutTimeoutService.js';
import {createLoyaltyService} from './services/loyaltyService.js';
import {createCartRepository} from './repositories/cartRepository.js';
import {createOrderRepository} from './repositories/orderRepository.js';
import {createCouponRepository} from './repositories/couponRepository.js';
import {createLoyaltyRepository} from './repositories/loyaltyRepository.js';

export async function configureOrderRuntime({
  connection,
  models
}) {
  const orderModels = registerOrderModels(connection);

  await Promise.all(
    Object.values(orderModels).map(model => model.init())
  );

  const loyaltyRepository = createLoyaltyRepository({
    LoyaltyAccount: orderModels.LoyaltyAccount,
    LoyaltyTransaction: orderModels.LoyaltyTransaction
  });
  const orderRepository = createOrderRepository({Order: orderModels.Order});
  const couponRepository = createCouponRepository({Coupon: orderModels.Coupon});
  const cartRepository = createCartRepository({Cart: orderModels.Cart});
  const loyaltyService = createLoyaltyService({loyaltyRepository});
  const workflowService = createOrderWorkflowService({
    orderRepository,
    couponRepository,
    cartRepository,
    Outbox: models.Outbox,
    loyaltyService
  });
  const timeoutWorker = createCheckoutTimeoutWorker({
    connection,
    orderRepository,
    workflowService
  });

  return {
    models: orderModels,
    start: () => timeoutWorker.start(),
    stop: () => timeoutWorker.stop(),
    consumers: createOrderWorkflowConsumers({workflowService})
  };
}
