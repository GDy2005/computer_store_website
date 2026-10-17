export function createInventoryConsumers({
  inventoryService
}) {
  return [
    {
      topic: 'orders.created.v1',
      groupId: 'catalog-order-created-group',
      handler(event, session) {
        return inventoryService.reserve(
          event,
          session
        );
      }
    },
    {
      topic: 'inventory.release-requested.v1',
      groupId: 'catalog-inventory-release-group',
      handler(event, session) {
        return inventoryService.release(
          event,
          session
        );
      }
    },
    {
      topic: 'orders.confirmed.v1',
      groupId: 'catalog-order-confirmed-group',
      handler(event, session) {
        return inventoryService.commit(
          event,
          session
        );
      }
    }
  ];
}
