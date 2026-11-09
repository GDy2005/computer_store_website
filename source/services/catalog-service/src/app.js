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
} from './clients/identityClient.js';

import {
  createCategoryService
} from './services/categoryService.js';

import {
  createProductService
} from './services/productService.js';

import {
  createCommentService
} from './services/commentService.js';

import {
  createRatingService
} from './services/ratingService.js';

import {
  createUploadService
} from './services/uploadService.js';

import {createCategoryRepository} from './repositories/categoryRepository.js';
import {createProductRepository} from './repositories/productRepository.js';
import {createFeedbackRepository} from './repositories/feedbackRepository.js';

import {
  createCategoryController
} from './controllers/categoryController.js';

import {
  createProductController
} from './controllers/productController.js';

import {
  createCommentController
} from './controllers/commentController.js';

import {
  createRatingController
} from './controllers/ratingController.js';

import {
  createUploadController
} from './controllers/uploadController.js';

import {
  createCategoryRouter
} from './routes/categoryRoutes.js';

import {
  createProductRouter
} from './routes/productRoutes.js';

import {
  createCommentRouter
} from './routes/commentRoutes.js';

import {
  createRatingRouter
} from './routes/ratingRoutes.js';

import {
  createUploadRouter
} from './routes/uploadRoutes.js';

import {
  createAdminRouter
} from './routes/adminRoutes.js';

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

  const categoryRepository = createCategoryRepository({
    Category: catalogModels.Category,
    Product: catalogModels.Product
  });

  const productRepository = createProductRepository({
    Product: catalogModels.Product
  });

  const feedbackRepository = createFeedbackRepository({
    Comment: catalogModels.Comment,
    Rating: catalogModels.Rating
  });

  const categoryService =
    createCategoryService({
      categoryRepository
    });

  const productService =
    createProductService({
      connection,
      productRepository,
      categoryRepository,
      Outbox: catalogModels.Outbox
    });

  const commentService =
    createCommentService({
      connection,
      productRepository,
      feedbackRepository,
      Outbox: catalogModels.Outbox,
      identityClient
    });

  const ratingService =
    createRatingService({
      connection,
      productRepository,
      feedbackRepository,
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
