import sanitizeHtml from 'sanitize-html';
import {AppError} from '@store/validation';

import {
  enqueueCommentCreated
} from '../events/catalog-events.js';
import {
  createProductRepository
} from '../repositories/productRepository.js';
import {
  createFeedbackRepository
} from '../repositories/feedbackRepository.js';

function commentId(value) {
  return String(value?._id || value || '');
}

function toCommentResponse(comment, userId, replies = []) {
  const likedBy = comment.likedBy || [];
  const dislikedBy = comment.dislikedBy || [];

  return {
    _id: commentId(comment),
    productId: String(comment.productId),
    parentCommentId: comment.parentCommentId
      ? String(comment.parentCommentId)
      : null,
    displayName: comment.displayName,
    content: comment.content,
    likeCount: likedBy.length,
    dislikeCount: dislikedBy.length,
    myReaction: userId && likedBy.includes(userId)
      ? 'LIKE'
      : userId && dislikedBy.includes(userId)
        ? 'DISLIKE'
        : null,
    replies,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
}

export function createCommentService({
  connection,
  productRepository: injectedProductRepository,
  feedbackRepository: injectedFeedbackRepository,
  Product,
  Comment,
  Rating,
  Outbox,
  identityClient
}) {
  const productRepository = injectedProductRepository ||
    createProductRepository({Product});
  const feedbackRepository = injectedFeedbackRepository ||
    createFeedbackRepository({Comment, Rating});
  async function requireProduct(productId) {
    const product =
      await productRepository.existsActive(productId);

    if (!product) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Product not found'
      );
    }
  }

  async function list(productId, {page, limit}, userId = null) {
    await requireProduct(productId);

    const skip = (page - 1) * limit;

    const {items, replies, totalItems} =
      await feedbackRepository.listComments({
        productId,
        skip,
        limit
      });

    const repliesByParent = new Map();
    for (const reply of replies) {
      const key = String(reply.parentCommentId);
      const group = repliesByParent.get(key) || [];
      group.push(toCommentResponse(reply, userId));
      repliesByParent.set(key, group);
    }

    return {
      items: items.map(item => toCommentResponse(
        item,
        userId,
        repliesByParent.get(commentId(item)) || []
      )),
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
    let parentCommentId = null;

    if (input.parentCommentId) {
      const parent = await feedbackRepository.findComment({
        productId,
        commentId: input.parentCommentId
      });

      if (!parent) {
        throw new AppError(404, 'NOT_FOUND', 'Parent comment not found');
      }

      if (parent.parentCommentId) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Replies can only target a top-level comment'
        );
      }

      parentCommentId = parent._id;
    }

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
      const comment = await feedbackRepository.createComment(
        {
          productId,
          parentCommentId,
          userId: userId || null,
          guestName,
          guestEmail,
          displayName,
          content
        },
        session
      );

      await enqueueCommentCreated({
        Outbox,
        comment,
        correlationId: requestId,
        session
      });

      return toCommentResponse(comment.toObject(), userId);
    });
  }

  async function react({
    productId,
    commentId: targetCommentId,
    userId,
    reaction
  }) {
    await requireProduct(productId);

    const comment = await connection.transaction(session =>
      feedbackRepository.updateReaction({
        productId,
        commentId: targetCommentId,
        userId,
        reaction,
        session
      })
    );

    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', 'Comment not found');
    }

    return toCommentResponse(comment.toObject(), userId);
  }

  return {list, create, react};
}
