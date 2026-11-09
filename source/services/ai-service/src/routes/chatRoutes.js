import {Router} from 'express';

import {validateChat} from '../validations/chatValidation.js';

export function createChatRouter(controller) {
  const router = Router();

  router.post('/api/v1/ai/chat', validateChat, controller.create);

  return router;
}
