import {AppError} from '@store/validation';

export function requireUser(req, res, next) {
  if (!req.context?.userId) {
    return next(
      new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required'
      )
    );
  }

  next();
}