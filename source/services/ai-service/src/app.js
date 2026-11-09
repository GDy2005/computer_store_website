import {Router} from 'express';

import {createChatController} from './controllers/chatController.js';
import {createChatRouter} from './routes/chatRoutes.js';
import {createChatService} from './services/chatService.js';

export function buildApp({searchClient, aiProvider}) {
  const router = Router();
  const chatService = createChatService({searchClient, aiProvider});
  const controller = createChatController({chatService});

  router.use(createChatRouter(controller));
  return router;
}
