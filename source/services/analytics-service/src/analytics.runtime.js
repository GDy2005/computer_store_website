import {registerAnalyticsModels} from './config/database.js';
import {createAnalyticsConsumers} from './events/analytics.consumer.js';
import {createAnalyticsProjector} from './projections/analytics.projector.js';

export async function configureAnalyticsRuntime({connection}) {
  const analyticsModels = registerAnalyticsModels(connection);
  await Promise.all(
    Object.values(analyticsModels).map(model => model.init())
  );

  const projector = createAnalyticsProjector(analyticsModels);

  return {
    models: analyticsModels,
    consumers: createAnalyticsConsumers({projector})
  };
}
