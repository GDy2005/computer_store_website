import {startService} from '@store/service-runtime';

import {buildApp} from './app.js';
import {handleProbe} from './events/handlers.js';
import {configureSearchRuntime} from './search.runtime.js';

await startService(
  'search-service',
  buildApp,
  handleProbe,
  {configure: configureSearchRuntime}
);
