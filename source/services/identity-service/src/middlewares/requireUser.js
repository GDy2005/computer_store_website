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

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.context?.userId) {
      return next(
        new AppError(
          401,
          'UNAUTHORIZED',
          'Authentication required'
        )
      );
    }

    if (!roles.includes(req.context.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'Insufficient permission'
        )
      );
    }

    next();
  };
}