import {AppError} from '@store/validation';

export function requireAdmin(req, res, next) {
  if (!req.context?.userId) {
    return next(
      new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required'
      )
    );
  }

  if (req.context.role !== 'ADMIN') {
    return next(
      new AppError(
        403,
        'FORBIDDEN',
        'Admin role required'
      )
    );
  }

  next();
}