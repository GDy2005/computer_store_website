import express from 'express';

import {sendSuccess} from '@store/http-response';
import {AppError, errorHandler, internalAuth} from '@store/validation';

import {buildApp} from './app.js';
import {createSearchClient} from './clients/searchClient.js';
import {createAiProvider} from './services/aiProviderService.js';

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
  sendSuccess(res, {
    message: 'AI Service is live',
    data: {service: 'ai-service'}
  });
});
app.get('/health/ready', async (req, res) => {
  try {
    const response = await fetch(`${searchUrl}/health/ready`, {
      signal: AbortSignal.timeout(5000)
    });
    const ready = response.ok;
    if (ready) {
      sendSuccess(res, {
        message: 'AI Service is ready',
        data: {service: 'ai-service', search: true}
      });
      return;
    }

    res.status(503).json({
      success: false,
      message: 'Search Service is not ready',
      data: {service: 'ai-service', search: false}
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Search Service is unavailable',
      data: {service: 'ai-service', search: false}
    });
  }
});
app.use(internalAuth(secret));
app.get('/internal/foundation', (req, res) => {
  sendSuccess(res, {
    message: 'AI foundation status retrieved successfully',
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
