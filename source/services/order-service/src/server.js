import {startService} from '@store/service-runtime';
import {buildApp} from './app.js';
import {handleProbe} from './events/handlers.js';
await startService('order-service', buildApp, handleProbe);
