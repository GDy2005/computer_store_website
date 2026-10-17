import {startService} from '@store/service-runtime';

import {buildApp} from './app.js';
import {handleProbe} from './events/handlers.js';

import {
  configureOrderRuntime
} from './order.runtime.js';

await startService(
  'order-service',
  buildApp,
  handleProbe,
  {configure: configureOrderRuntime}
);