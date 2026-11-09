import {
  allowOnly,
  assertObject,
  parseEmail,
  parseObjectId,
  parseQueryInteger,
  requiredText,
  validateObjectIdParam,
  validationError
} from './helpers.js';

export const validateCommentProductId =
  validateObjectIdParam('id');
export const validateCommentId =
  validateObjectIdParam('commentId');

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
      allowOnly(body, ['content', 'parentCommentId']);

      req.body = {
        content: requiredText(
          body.content,
          'content',
          1000
        ),
        ...(body.parentCommentId !== undefined && {
          parentCommentId: parseObjectId(
            body.parentCommentId,
            'parentCommentId'
          )
        })
      };
    } else {
      allowOnly(body, [
        'guestName',
        'guestEmail',
        'content',
        'parentCommentId'
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
        ),
        ...(body.parentCommentId !== undefined && {
          parentCommentId: parseObjectId(
            body.parentCommentId,
            'parentCommentId'
          )
        })
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function validateCommentReaction(req, res, next) {
  try {
    assertObject(req.body);
    allowOnly(req.body, ['reaction']);

    if (!['LIKE', 'DISLIKE', 'NONE'].includes(req.body.reaction)) {
      throw validationError('Invalid reaction');
    }

    req.body = {reaction: req.body.reaction};
    next();
  } catch (error) {
    next(error);
  }
}
