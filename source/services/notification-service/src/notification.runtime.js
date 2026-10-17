import {getEmailJobModel} from './models/email-job.model.js';
import {createEmailRequestedHandler} from './events/email-requested.consumer.js';
import {createOrderConfirmedHandler} from './events/order-confirmed.consumer.js';
import {createEmailService} from './services/email.service.js';
import {createEmailWorker} from './services/email-worker.service.js';

export async function configureNotification({connection}) {
  const EmailJob = getEmailJobModel(connection);
  await EmailJob.init();
  const emailService = createEmailService();
  const worker = createEmailWorker({EmailJob, emailService});

  return {
    models: {EmailJob},
    consumers: [
      {
        topic: 'email.requested.v1',
        groupId: 'notification-email-group',
        handler: createEmailRequestedHandler({EmailJob})
      },
      {
        topic: 'orders.confirmed.v1',
        groupId: 'notification-order-group',
        handler: createOrderConfirmedHandler({EmailJob})
      }
    ],
    start: () => worker.start(),
    stop: () => worker.stop()
  };
}
