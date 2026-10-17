export function createOrderWorkflowConsumers({
  workflowService
}) {
  return [
    {
      topic: 'inventory.reserved.v1',
      groupId: 'order-inventory-reserved-group',
      handler(event, session) {
        return workflowService.reserved(event, session);
      }
    },
    {
      topic: 'inventory.rejected.v1',
      groupId: 'order-inventory-rejected-group',
      handler(event, session) {
        return workflowService.rejected(event, session);
      }
    }
  ];
}
