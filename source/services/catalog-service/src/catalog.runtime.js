import {
  registerCatalogModels
} from './config/database.js';

import {
  createInventoryService
} from './services/inventoryService.js';

import {
  createInventoryConsumers
} from './events/inventory.consumer.js';
import {createProductRepository} from './repositories/productRepository.js';
import {createInventoryRepository} from './repositories/inventoryRepository.js';

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
      productRepository: createProductRepository({
        Product: catalogModels.Product
      }),
      inventoryRepository: createInventoryRepository({
        InventoryReservation: catalogModels.InventoryReservation
      }),
      Outbox: models.Outbox
    });

  return {
    models: catalogModels,
    consumers: createInventoryConsumers({
      inventoryService
    })
  };
}
