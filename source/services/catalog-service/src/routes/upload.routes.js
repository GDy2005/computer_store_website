import {Router} from 'express';
import multer from 'multer';
import {AppError} from '@store/validation';

import {
  requireAdmin
} from '../middlewares/require-admin.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6
  },
  fileFilter(req, file, callback) {
    const acceptedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ]);

    if (!acceptedTypes.has(file.mimetype)) {
      return callback(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Only JPEG, PNG, WebP or AVIF images are accepted'
        )
      );
    }

    callback(null, true);
  }
});

function receiveImages(req, res, next) {
  upload.array('images', 6)(req, res, error => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          error.message
        )
      );
      return;
    }

    next(error);
  });
}

export function createUploadRouter(controller) {
  const router = Router();

  router.post(
    '/api/v1/admin/products/images',
    requireAdmin,
    receiveImages,
    controller.upload
  );

  return router;
}
