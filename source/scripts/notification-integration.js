import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {createEvent} from '@store/event-contracts';
import {kafkaClient} from '@store/kafka-client';

async function eventually(check, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(message);
}

const connection = await mongoose.createConnection(
  process.env.MONGODB_URI,
  {dbName: process.env.DB_NAME || 'notification_db'}
).asPromise();
const jobs = connection.db.collection('email_jobs');
const processed = connection.db.collection('processed_events');
const deadLetters = connection.db.collection('foundation_dead_letters');
const kafka = kafkaClient(`notification-integration-${randomUUID()}`);
const producer = kafka.producer({allowAutoTopicCreation: false});
await producer.connect();

const event = createEvent('email.requested.v1', {
  producer: 'identity-service',
  key: `notification-test-${randomUUID()}`,
  correlationId: randomUUID(),
  payload: {
    userId: 'notification-test-user',
    recipientEmail: 'notification-test@example.invalid',
    type: 'PASSWORD_RESET',
    templateData: {
      fullName: 'Notification Test',
      actionUrl: 'https://example.invalid/reset?token=integration-test'
    }
  }
});
const deadBefore = await deadLetters.countDocuments();

try {
  const message = {key: event.key, value: JSON.stringify(event)};
  await producer.send({topic: 'email.requested.v1', messages: [message, message]});

  const sentJob = await eventually(
    () => jobs.findOne({eventId: event.eventId, status: 'SENT'}),
    'Notification worker did not send the email job'
  );
  if (!sentJob || await jobs.countDocuments({eventId: event.eventId}) !== 1) {
    throw new Error('Duplicate event created duplicate email jobs');
  }

  const invalid = {...event, eventId: randomUUID(), payload: {userId: 'invalid'}};
  await producer.send({
    topic: 'email.requested.v1',
    messages: [{key: invalid.key, value: JSON.stringify(invalid)}]
  });
  await eventually(
    async () => await deadLetters.countDocuments() > deadBefore,
    'Invalid email event did not reach the DLQ'
  );

  console.log('PASS Notification: idempotent email job, JSON delivery and invalid-event DLQ');
} finally {
  await jobs.deleteMany({eventId: event.eventId});
  await processed.deleteMany({eventId: event.eventId});
  await producer.disconnect();
  await connection.close();
}
