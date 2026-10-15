import {Router} from 'express';

import {
  requireAdmin
} from '../middlewares/require-admin.js';

import {
  validateCategoryId,
  validateCreateCategory,
  validateUpdateCategory
} from '../validations/category.validation.js';

import {
  validateAdminProductList,
  validateCreateProduct,
  validateProductId,
  validateUpdateProduct
} from '../validations/product.validation.js';

export function createAdminRouter({
  categoryController,
  productController
}) {
  const router = Router();

  router.use('/api/v1/admin', requireAdmin);

  router.get(
    '/api/v1/admin/categories',
    categoryController.adminList
  );

  router.post(
    '/api/v1/admin/categories',
    validateCreateCategory,
    categoryController.create
  );

  router.patch(
    '/api/v1/admin/categories/:id',
    validateCategoryId,
    validateUpdateCategory,
    categoryController.update
  );

  router.delete(
    '/api/v1/admin/categories/:id',
    validateCategoryId,
    categoryController.deactivate
  );

  router.get(
    '/api/v1/admin/products',
    validateAdminProductList,
    productController.adminList
  );

  router.get(
    '/api/v1/admin/products/:id',
    validateProductId,
    productController.adminDetail
  );

  router.post(
    '/api/v1/admin/products',
    validateCreateProduct,
    productController.create
  );

  router.patch(
    '/api/v1/admin/products/:id',
    validateProductId,
    validateUpdateProduct,
    productController.update
  );

  router.delete(
    '/api/v1/admin/products/:id',
    validateProductId,
    productController.deactivate
  );

  return router;
}