import {
  allowOnly,
  assertObject,
  parseInteger,
  validateBody,
  validateObjectIdParam
} from './helpers.js';

export const validateRatingProductId =
  validateObjectIdParam('id');

export const validateRatingBody = validateBody(body => {
  assertObject(body);
  allowOnly(body, ['stars']);

  return {
    stars: parseInteger(
      body.stars,
      'stars',
      {minimum: 1, maximum: 5}
    )
  };
});