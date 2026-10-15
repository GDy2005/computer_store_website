import express from 'express';

import {
  createEmailJobService
} from './services/email-job.service.js';

import {
  createEmailJobRouter
} from './routes/email-job.routes.js';

export function buildApp({models}) {
  const router = express.Router();
  const {EmailJob} = models;
  const emailJobService = createEmailJobService({EmailJob});

  router.use(createEmailJobRouter({emailJobService}));

  return router;
}
