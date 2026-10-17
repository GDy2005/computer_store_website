import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmailRequestedHandler} from '../services/notification-service/src/events/email-requested.consumer.js';
import {createEmailService} from '../services/notification-service/src/services/email.service.js';
import {createEmailWorker} from '../services/notification-service/src/services/email-worker.service.js';
import {createOrderConfirmedHandler} from '../services/notification-service/src/events/order-confirmed.consumer.js';

test('email requested handler creates an idempotent job by event ID', async () => {
  let operation;
  const EmailJob = {
    updateOne: async (...args) => { operation = args; }
  };
  const handler = createEmailRequestedHandler({EmailJob});
  await handler({
    eventId: 'event-1',
    payload: {
      recipientEmail: 'user@example.com',
      type: 'ACCOUNT_ACTIVATION',
      templateData: {fullName: 'User', actionUrl: 'https://example.com/activate'}
    }
  }, {});
  assert.deepEqual(operation[0], {eventId: 'event-1'});
  assert.equal(operation[1].$setOnInsert.status, 'PENDING');
  assert.equal(operation[2].upsert, true);
});

test('confirmed order creates an idempotent confirmation email job', async () => {
  let operation;
  const handler = createOrderConfirmedHandler({
    EmailJob: {
      async updateOne(...args) {
        operation = args;
      }
    }
  });

  await handler({
    eventId: 'event-order-1',
    payload: {
      orderNumber: 'ORD-20261016-ABC123',
      customer: {
        fullName: 'User',
        email: 'user@example.com'
      }
    }
  }, {});

  assert.deepEqual(operation[0], {eventId: 'event-order-1'});
  assert.equal(
    operation[1].$setOnInsert.template,
    'ORDER_CONFIRMATION'
  );
  assert.equal(
    operation[1].$setOnInsert.templateData.orderNumber,
    'ORD-20261016-ABC123'
  );
  assert.equal(operation[2].upsert, true);
});

test('email service renders activation email without logging credentials', async () => {
  let message;
  const service = createEmailService({
    transporter: {sendMail: async value => { message = value; return {messageId: 'message-1'}; }}
  });
  await service.send({
    recipientEmail: 'user@example.com',
    template: 'ACCOUNT_ACTIVATION',
    templateData: {fullName: 'User', actionUrl: 'https://example.com/activate'}
  });
  assert.equal(message.to, 'user@example.com');
  assert.match(message.subject, /activate/i);
  assert.match(message.text, /https:\/\/example.com\/activate/);
});

test('email worker marks a successfully delivered job as sent', async () => {
  let update;
  const EmailJob = {
    findOneAndUpdate: async () => ({_id: 'job-1', attempts: 1, recipientEmail: 'user@example.com', template: 'PASSWORD_RESET', templateData: {}}),
    updateOne: async (...args) => { update = args; }
  };
  const worker = createEmailWorker({EmailJob, emailService: {send: async () => {}}});
  assert.equal(await worker.processOne(), true);
  assert.equal(update[1].$set.status, 'SENT');
  assert.ok(update[1].$set.sentAt instanceof Date);
});

test('email worker stops retrying after five failed attempts', async () => {
  let update;
  const EmailJob = {
    findOneAndUpdate: async () => ({_id: 'job-1', attempts: 5, recipientEmail: 'user@example.com', template: 'PASSWORD_RESET', templateData: {}}),
    updateOne: async (...args) => { update = args; }
  };
  const worker = createEmailWorker({EmailJob, emailService: {send: async () => { throw new Error('smtp unavailable'); }}});
  assert.equal(await worker.processOne(), true);
  assert.equal(update[1].$set.status, 'FAILED');
  assert.equal(update[1].$set.lastError, 'smtp unavailable');
});
