import express from 'express';
import {createCategoryController} from './category.controller.js';

export function createCategoryRouter(dependencies) {
  const router = express.Router();
  const controller = createCategoryController(dependencies);
  router.get('/api/v1/categories', controller.list);
  return router;
}
