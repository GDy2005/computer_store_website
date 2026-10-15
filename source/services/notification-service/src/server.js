import {startService} from '@store/service-runtime';
import {buildApp} from './app.js';
import {handleProbe} from './events/handlers.js';
import {configureNotification} from './notification.runtime.js';

await startService(
  'notification-service',
  buildApp,
  handleProbe,
  {configure: configureNotification}
);
