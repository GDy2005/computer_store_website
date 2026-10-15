export function createInventoryConsumers({
  inventoryService
}) {
  return [
    {
      topic: 'orders.created.v1',
      groupId: 'catalog-inventory-group',
      handler(event, session) {
        return inventoryService.reserve(
          event,
          session
        );
      }
    },
    {
      topic: 'inventory.release-requested.v1',
      groupId: 'catalog-inventory-group',
      handler(event, session) {
        return inventoryService.release(
          event,
          session
        );
      }
    }
  ];
}