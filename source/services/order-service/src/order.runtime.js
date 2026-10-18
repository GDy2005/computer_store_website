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

export async function configureOrderRuntime({
  connection,
  models
}) {
  const orderModels = registerOrderModels(connection);

  await Promise.all(
    Object.values(orderModels).map(model => model.init())
  );

  const workflowService = createOrderWorkflowService({
    ...orderModels,
    Outbox: models.Outbox
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
