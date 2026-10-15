import {Router} from 'express';

import {
  createEmailJobController
} from '../controllers/email-job.controller.js';

import {
  validateEventId
} from '../validations/email-job.validation.js';

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
