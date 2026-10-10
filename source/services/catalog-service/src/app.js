import express from 'express';
import {getCategoryModel} from './modules/categories/category.model.js';
import {createCategoryRouter} from './modules/categories/category.routes.js';

export function buildApp({connection}) {
  const router = express.Router();
  const Category = getCategoryModel(connection);
  router.use(createCategoryRouter({Category}));
  return router;
}
