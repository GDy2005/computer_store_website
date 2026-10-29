import {Router} from 'express';

import {createChatController} from './controllers/chat.controller.js';
import {createChatRouter} from './routes/chat.routes.js';
import {createChatService} from './services/chat.service.js';

export function buildApp({searchClient, aiProvider}) {
  const router = Router();
  const chatService = createChatService({searchClient, aiProvider});
  const controller = createChatController({chatService});

  router.use(createChatRouter(controller));
  return router;
}
