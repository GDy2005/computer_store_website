import {randomUUID} from 'node:crypto';
import {AppError} from '@store/validation';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function identifyCartOwner(req, res, next) {
  if (req.context?.userId) {
    req.cartOwner = {
      userId: req.context.userId,
      guestToken: null
    };

    next();
    return;
  }

  const suppliedToken = req.get('x-guest-cart-token');

  if (suppliedToken && !uuidPattern.test(suppliedToken)) {
    next(
      new AppError(
        400,
        'INVALID_GUEST_TOKEN',
        'Invalid guest cart token'
      )
    );
    return;
  }

  const guestToken = suppliedToken || randomUUID();

  req.cartOwner = {
    userId: null,
    guestToken
  };

  res.set('x-guest-cart-token', guestToken);
  next();
}