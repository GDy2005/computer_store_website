import {Router} from 'express';

import {validateSearch} from '../validations/searchValidation.js';

export function createSearchRouter(controller) {
  const router = Router();

  router.get('/api/v1/search', validateSearch, controller.list);

  return router;
}
