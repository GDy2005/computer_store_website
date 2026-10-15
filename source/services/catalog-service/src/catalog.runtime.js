import {
  registerCatalogModels
} from './config/database.js';

import {
  createInventoryService
} from './services/inventory.service.js';

import {
  createInventoryConsumers
} from './events/inventory.consumer.js';

export async function configureCatalogRuntime({
  connection,
  models
}) {
  const catalogModels =
    registerCatalogModels(connection);

  await Promise.all(
    Object.values(catalogModels).map(model =>
      model.init()
    )
  );

  const inventoryService =
    createInventoryService({
      Product: catalogModels.Product,
      InventoryReservation:
        catalogModels.InventoryReservation,
      Outbox: models.Outbox
    });

  return {
    models: catalogModels,
    consumers: createInventoryConsumers({
      inventoryService
    })
  };
}