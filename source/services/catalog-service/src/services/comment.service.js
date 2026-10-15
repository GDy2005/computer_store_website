import sanitizeHtml from 'sanitize-html';
import {AppError} from '@store/validation';

import {
  enqueueCommentCreated
} from '../events/catalog-events.js';

export function createCommentService({
  connection,
  Product,
  Comment,
  Outbox,
  identityClient
}) {
  async function requireProduct(productId) {
    const product = await Product.exists({
      _id: productId,
      isActive: true
    });

    if (!product) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Product not found'
      );
    }
  }

  async function list(productId, {page, limit}) {
    await requireProduct(productId);

    const filter = {productId};
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      Comment.find(filter)
        .select('-guestEmail')
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(filter)
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / limit)
        )
      }
    };
  }

  async function create({
    productId,
    input,
    userId,
    requestId
  }) {
    await requireProduct(productId);

    const content = sanitizeHtml(input.content, {
      allowedTags: [],
      allowedAttributes: {}
    }).trim();

    if (!content) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Comment is empty after sanitization'
      );
    }

    let displayName;
    let guestName = null;
    let guestEmail = null;

    if (userId) {
      const user = await identityClient.getUserSummary({
        userId,
        requestId
      });

      displayName = user.fullName;
    } else {
      displayName = input.guestName;
      guestName = input.guestName;
      guestEmail = input.guestEmail;
    }

    return connection.transaction(async session => {
      const [comment] = await Comment.create(
        [
          {
            productId,
            userId: userId || null,
            guestName,
            guestEmail,
            displayName,
            content
          }
        ],
        {session}
      );

      await enqueueCommentCreated({
        Outbox,
        comment,
        correlationId: requestId,
        session
      });

      const result = comment.toObject();
      delete result.guestEmail;

      return result;
    });
  }

  return {list, create};
}