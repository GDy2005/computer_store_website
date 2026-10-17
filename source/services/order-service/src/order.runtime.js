import {
  registerOrderModels
} from './config/database.js';

import {
  createOrderWorkflowService
} from './services/order-workflow.service.js';

import {
  createOrderWorkflowConsumers
} from './events/order-workflow.consumer.js';

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

  return {
    models: orderModels,
    consumers: createOrderWorkflowConsumers({workflowService})
  };
}
