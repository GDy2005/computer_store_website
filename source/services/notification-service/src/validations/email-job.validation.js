import {AppError} from '@store/validation';

export function validateEventId(req, res, next) {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.eventId)) {
    return next(
      new AppError(
        400,
        'VALIDATION_ERROR',
        'Invalid event ID'
      )
    );
  }

  next();
}
