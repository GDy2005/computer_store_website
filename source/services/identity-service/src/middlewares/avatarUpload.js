import multer from 'multer';
import {AppError} from '@store/validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, callback) {
    const acceptedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ]);

    if (!acceptedTypes.has(file.mimetype)) {
      callback(new AppError(
        400,
        'VALIDATION_ERROR',
        'Only JPEG, PNG, WebP or AVIF images are accepted'
      ));
      return;
    }

    callback(null, true);
  }
});

export function receiveAvatar(req, res, next) {
  upload.single('avatar')(req, res, error => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      next(new AppError(
        400,
        'VALIDATION_ERROR',
        error.message
      ));
      return;
    }

    next(error);
  });
}
