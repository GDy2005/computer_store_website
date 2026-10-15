import {
  allowOnly,
  assertObject,
  parseEmail,
  parseQueryInteger,
  requiredText,
  validateObjectIdParam
} from './helpers.js';

export const validateCommentProductId =
  validateObjectIdParam('id');

export function validateCommentList(req, res, next) {
  try {
    allowOnly(req.query, ['page', 'limit']);

    req.validatedQuery = {
      page: parseQueryInteger(
        req.query.page,
        'page',
        {minimum: 1}
      ) || 1,
      limit: parseQueryInteger(
        req.query.limit,
        'limit',
        {minimum: 1, maximum: 50}
      ) || 10
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function validateCommentBody(req, res, next) {
  try {
    const body = req.body;

    assertObject(body);

    if (req.context?.userId) {
      allowOnly(body, ['content']);

      req.body = {
        content: requiredText(
          body.content,
          'content',
          1000
        )
      };
    } else {
      allowOnly(body, [
        'guestName',
        'guestEmail',
        'content'
      ]);

      req.body = {
        guestName: requiredText(
          body.guestName,
          'guestName',
          100
        ),
        guestEmail: parseEmail(body.guestEmail),
        content: requiredText(
          body.content,
          'content',
          1000
        )
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}
