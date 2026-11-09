import {Router} from 'express';

import {
  createEmailJobController
} from '../controllers/emailJobController.js';

import {
  validateEventId
} from '../validations/emailJobValidation.js';

export function createEmailJobRouter(dependencies) {
  const router = Router();
  const controller = createEmailJobController(dependencies);

  router.get(
    '/internal/emails/stats',
    controller.stats
  );

  router.get(
    '/internal/emails/jobs/:eventId',
    validateEventId,
    controller.getByEventId
  );

  return router;
}
