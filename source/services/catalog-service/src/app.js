import express from 'express';

import {
  registerCatalogModels
} from './config/database.js';

import {
  cloudinary,
  cloudinaryConfigured
} from './config/cloudinary.js';

import {
  createIdentityClient
} from './clients/identity-client.service.js';

import {
  createCategoryService
} from './services/category.service.js';

import {
  createProductService
} from './services/product.service.js';

import {
  createCommentService
} from './services/comment.service.js';

import {
  createRatingService
} from './services/rating.service.js';

import {
  createUploadService
} from './services/upload.service.js';

import {
  createCategoryController
} from './controllers/category.controller.js';

import {
  createProductController
} from './controllers/product.controller.js';

import {
  createCommentController
} from './controllers/comment.controller.js';

import {
  createRatingController
} from './controllers/rating.controller.js';

import {
  createUploadController
} from './controllers/upload.controller.js';

import {
  createCategoryRouter
} from './routes/category.routes.js';

import {
  createProductRouter
} from './routes/product.routes.js';

import {
  createCommentRouter
} from './routes/comment.routes.js';

import {
  createRatingRouter
} from './routes/rating.routes.js';

import {
  createUploadRouter
} from './routes/upload.routes.js';

import {
  createAdminRouter
} from './routes/admin.routes.js';

export function buildApp({connection, models}) {
  const router = express.Router();

  const catalogModels = {
    ...models,
    ...registerCatalogModels(connection)
  };

  const identityClient = createIdentityClient({
    identityUrl:
      process.env.IDENTITY_SERVICE_URL ||
      'http://identity-service:5001',
    secret: process.env.INTERNAL_SERVICE_SECRET
  });

  const categoryService =
    createCategoryService({
      Category: catalogModels.Category,
      Product: catalogModels.Product
    });

  const productService =
    createProductService({
      connection,
      Product: catalogModels.Product,
      Category: catalogModels.Category,
      Outbox: catalogModels.Outbox
    });

  const commentService =
    createCommentService({
      connection,
      Product: catalogModels.Product,
      Comment: catalogModels.Comment,
      Outbox: catalogModels.Outbox,
      identityClient
    });

  const ratingService =
    createRatingService({
      connection,
      Product: catalogModels.Product,
      Rating: catalogModels.Rating,
      Outbox: catalogModels.Outbox,
      identityClient
    });

  const uploadService =
    createUploadService({
      cloudinary,
      configured: cloudinaryConfigured
    });

  const categoryController =
    createCategoryController({
      categoryService
    });

  const productController =
    createProductController({
      productService
    });

  const commentController =
    createCommentController({
      commentService
    });

  const ratingController =
    createRatingController({
      ratingService
    });

  const uploadController =
    createUploadController({
      uploadService
    });

  router.use(
    createCategoryRouter(categoryController)
  );

  router.use(
    createProductRouter(productController)
  );

  router.use(
    createCommentRouter(commentController)
  );

  router.use(
    createRatingRouter(ratingController)
  );

  // Upload phải đứng trước /admin/products/:id
  // để "images" không bị hiểu là một product ID.
  router.use(
    createUploadRouter(uploadController)
  );

  router.use(
    createAdminRouter({
      categoryController,
      productController
    })
  );

  return router;
}