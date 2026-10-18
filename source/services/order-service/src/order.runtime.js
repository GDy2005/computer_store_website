import {
  registerOrderModels
} from './config/database.js';

import {
  createOrderWorkflowService
} from './services/order-workflow.service.js';

import {
  createOrderWorkflowConsumers
} from './events/order-workflow.consumer.js';
import {createCheckoutTimeoutWorker} from './services/checkout-timeout.service.js';
import {createLoyaltyService} from './services/loyalty.service.js';

export async function configureOrderRuntime({
  connection,
  models
}) {
  const orderModels = registerOrderModels(connection);

  await Promise.all(
    Object.values(orderModels).map(model => model.init())
  );

  const loyaltyService = createLoyaltyService({
    LoyaltyAccount: orderModels.LoyaltyAccount,
    LoyaltyTransaction: orderModels.LoyaltyTransaction
  });
  const workflowService = createOrderWorkflowService({
    ...orderModels,
    Outbox: models.Outbox,
    loyaltyService
  });
  const timeoutWorker = createCheckoutTimeoutWorker({
    connection, Order: orderModels.Order, workflowService
  });

  return {
    models: orderModels,
    start: () => timeoutWorker.start(),
    stop: () => timeoutWorker.stop(),
    consumers: createOrderWorkflowConsumers({workflowService})
  };
}
