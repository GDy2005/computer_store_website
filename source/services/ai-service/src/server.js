import express from 'express';

import {AppError, errorHandler, internalAuth} from '@store/validation';

import {buildApp} from './app.js';
import {createSearchClient} from './clients/search-client.service.js';
import {createAiProvider} from './services/ai-provider.service.js';

const secret = process.env.INTERNAL_SERVICE_SECRET;

if (!secret) throw new Error('INTERNAL_SERVICE_SECRET required');

const port = Number(process.env.PORT || 5007);
const searchUrl = (
  process.env.SEARCH_SERVICE_URL || 'http://search-service:5006'
).replace(/\/$/, '');
const searchClient = createSearchClient({secret, baseUrl: searchUrl});
const aiProvider = createAiProvider();
const app = express();

app.use(express.json({limit: '32kb'}));
app.get('/health/live', (req, res) => {
  res.json({success: true, data: {service: 'ai-service'}});
});
app.get('/health/ready', async (req, res) => {
  try {
    const response = await fetch(`${searchUrl}/health/ready`, {
      signal: AbortSignal.timeout(5000)
    });
    const ready = response.ok;
    res.status(ready ? 200 : 503).json({
      success: ready,
      data: {service: 'ai-service', search: ready}
    });
  } catch {
    res.status(503).json({
      success: false,
      data: {service: 'ai-service', search: false}
    });
  }
});
app.use(internalAuth(secret));
app.get('/internal/foundation', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'ai-service',
      database: null,
      providerConfigured: aiProvider.configured,
      groundedBy: 'search-service'
    }
  });
});
app.use(buildApp({searchClient, aiProvider}));
app.use((req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Endpoint not found'));
});
app.use(errorHandler);

const server = app.listen(port, '0.0.0.0');

function shutdown() {
  return new Promise(resolve => server.close(resolve));
}

process.on('SIGTERM', () => shutdown().then(() => process.exit(0)));
process.on('SIGINT', () => shutdown().then(() => process.exit(0)));
