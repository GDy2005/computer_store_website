import mongoose from 'mongoose';
import {validateEvent} from '@store/event-contracts';
import {registerAnalyticsModels} from '../config/database.js';
import {createAnalyticsProjector} from '../projections/analytics.projector.js';
import {buildDefaultAnalyticsFixtures} from './default-fixtures.js';

if (process.env.ANALYTICS_REBUILD_CONFIRM !== 'true') {
  throw new Error(
    'Set ANALYTICS_REBUILD_CONFIRM=true to replace analytics projections'
  );
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if ((process.env.DB_NAME || 'analytics_db') !== 'analytics_db') {
  throw new Error('Rebuild may only write analytics_db');
}

const connection = await mongoose.createConnection(
  process.env.MONGODB_URI,
  {dbName: 'analytics_db'}
).asPromise();

try {
  const models = registerAnalyticsModels(connection);
  await Promise.all(Object.values(models).map(model => model.init()));
  const projector = createAnalyticsProjector(models);
  const handlers = {
    'users.created.v1': projector.userCreated,
    'users.updated.v1': projector.userUpdated,
    'products.created.v1': projector.productChanged,
    'products.updated.v1': projector.productChanged,
    'ratings.updated.v1': projector.ratingUpdated,
    'orders.confirmed.v1': projector.orderConfirmed,
    'orders.cancelled.v1': projector.orderCancelled,
    'orders.status-changed.v1': projector.orderStatusChanged
  };

  await Promise.all(Object.values(models).map(model => model.deleteMany({})));

  const fixtures = buildDefaultAnalyticsFixtures();
  for (const fixture of fixtures) {
    validateEvent(fixture.topic, fixture.event);
    const handler = handlers[fixture.topic];
    if (!handler) throw new Error(`Unsupported fixture topic ${fixture.topic}`);
    await connection.transaction(session => handler(fixture.event, session));
  }

  console.log(`Rebuilt analytics projections from ${fixtures.length} events`);
} finally {
  await connection.close();
}
