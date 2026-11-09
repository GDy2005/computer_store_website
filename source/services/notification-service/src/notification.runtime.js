import {getEmailJobModel} from './models/EmailJob.js';
import {createEmailRequestedHandler} from './events/email-requested.consumer.js';
import {createOrderConfirmedHandler} from './events/order-confirmed.consumer.js';
import {createEmailService} from './services/emailService.js';
import {createEmailWorker} from './services/emailWorkerService.js';
import {createEmailJobRepository} from './repositories/emailJobRepository.js';

export async function configureNotification({connection}) {
  const EmailJob = getEmailJobModel(connection);
  await EmailJob.init();
  const emailJobRepository = createEmailJobRepository({EmailJob});
  const emailService = createEmailService();
  const worker = createEmailWorker({emailJobRepository, emailService});

  return {
    models: {EmailJob},
    consumers: [
      {
        topic: 'email.requested.v1',
        groupId: 'notification-email-group',
        handler: createEmailRequestedHandler({emailJobRepository})
      },
      {
        topic: 'orders.confirmed.v1',
        groupId: 'notification-order-group',
        handler: createOrderConfirmedHandler({emailJobRepository})
      }
    ],
    start: () => worker.start(),
    stop: () => worker.stop()
  };
}
