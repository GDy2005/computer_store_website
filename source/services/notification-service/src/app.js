import express from 'express';

import {
  createEmailJobService
} from './services/emailJobService.js';

import {
  createEmailJobRouter
} from './routes/emailJobRoutes.js';
import {createEmailJobRepository} from './repositories/emailJobRepository.js';

export function buildApp({models}) {
  const router = express.Router();
  const {EmailJob} = models;
  const emailJobRepository = createEmailJobRepository({EmailJob});
  const emailJobService = createEmailJobService({emailJobRepository});

  router.use(createEmailJobRouter({emailJobService}));

  return router;
}
