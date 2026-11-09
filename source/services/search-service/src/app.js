import express from 'express';

import {createSearchController} from './controllers/searchController.js';
import {createSearchRouter} from './routes/searchRoutes.js';
import {createSearchService} from './services/searchService.js';
import {createProductSearchRepository} from './repositories/productSearchRepository.js';

export function buildApp({models}) {
  const router = express.Router();
  const productSearchRepository = createProductSearchRepository({
    searchIndex: models.SearchIndex
  });
  const searchService = createSearchService({productSearchRepository});
  const searchController = createSearchController({searchService});

  router.use(createSearchRouter(searchController));
  return router;
}
