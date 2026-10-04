export const domainTopics = ['users.created.v1','users.updated.v1','products.created.v1','products.updated.v1','comments.created.v1','ratings.updated.v1','orders.created.v1','inventory.reserved.v1','inventory.rejected.v1','inventory.release-requested.v1','orders.confirmed.v1','orders.cancelled.v1','orders.status-changed.v1','loyalty.changed.v1','email.requested.v1'];
export const probeTopic = 'foundation.probe.v1';
export const topics = [...domainTopics, probeTopic].flatMap(topic => [topic, `${topic}.retry`, `${topic}.dlq`]);
