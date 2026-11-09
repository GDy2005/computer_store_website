import {AppError} from '@store/validation';

const acceptedFields = new Set(['message']);

export function validateChat(req, res, next) {
  try {
    const body = req.body || {};

    for (const field of Object.keys(body)) {
      if (!acceptedFields.has(field)) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `Unsupported field: ${field}`
        );
      }
    }

    if (typeof body.message !== 'string') {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'message must be a string'
      );
    }

    const message = body.message.trim();

    if (message.length < 2 || message.length > 800) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'message must contain 2 to 800 characters'
      );
    }

    req.validatedBody = {message};
    next();
  } catch (error) {
    next(error);
  }
}
