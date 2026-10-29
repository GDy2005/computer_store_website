export function createAnalyticsConsumers({projector}) {
  return [
    ['users.created.v1', 'analytics-users-created-group', projector.userCreated],
    ['users.updated.v1', 'analytics-users-updated-group', projector.userUpdated],
    ['products.created.v1', 'analytics-products-created-group', projector.productChanged],
    ['products.updated.v1', 'analytics-products-updated-group', projector.productChanged],
    ['ratings.updated.v1', 'analytics-ratings-updated-group', projector.ratingUpdated],
    ['orders.confirmed.v1', 'analytics-orders-confirmed-group', projector.orderConfirmed],
    ['orders.cancelled.v1', 'analytics-orders-cancelled-group', projector.orderCancelled],
    ['orders.status-changed.v1', 'analytics-order-status-group', projector.orderStatusChanged]
  ].map(([topic, groupId, handler]) => ({topic, groupId, handler}));
}
