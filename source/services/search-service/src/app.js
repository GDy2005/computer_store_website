import express from 'express';

import {createSearchController} from './controllers/search.controller.js';
import {createSearchRouter} from './routes/search.routes.js';
import {createSearchService} from './services/search.service.js';

export function buildApp({models}) {
  const router = express.Router();
  const searchService = createSearchService({
    searchIndex: models.SearchIndex
  });
  const searchController = createSearchController({searchService});

  router.use(createSearchRouter(searchController));
  return router;
}
