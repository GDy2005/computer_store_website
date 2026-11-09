import {AppError} from '@store/validation';

export function requireAdmin(req, res, next) {
  if (!req.context?.userId) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }
  if (req.context.role !== 'ADMIN') {
    next(new AppError(403, 'FORBIDDEN', 'Administrator access required'));
    return;
  }
  next();
}
