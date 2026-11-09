import {AppError} from '@store/validation';

import {
  enqueueRatingUpdated
} from '../events/catalog-events.js';
import {
  createProductRepository
} from '../repositories/productRepository.js';
import {
  createFeedbackRepository
} from '../repositories/feedbackRepository.js';

export function createRatingService({
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
  async function getSummary(productId, userId = null) {
    const product =
      await productRepository.findRatingSummary(productId);

    if (!product) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Product not found'
      );
    }

    const [distribution, userRating] = await Promise.all([
      feedbackRepository.getRatingDistribution(product._id),
      userId
        ? feedbackRepository.findUserRating(product._id, userId)
        : null
    ]);

    return {
      averageRating: product.averageRating,
      ratingCount: product.ratingCount,
      myRating: userRating?.stars || null,
      distribution: Object.fromEntries(
        distribution.map(item => [
          String(item._id),
          item.count
        ])
      )
    };
  }

  async function upsert({
    productId,
    userId,
    stars,
    requestId
  }) {
    await identityClient.getUserSummary({
      userId,
      requestId
    });

    return connection.transaction(async session => {
      const product = await productRepository.findById(
        productId,
        session
      );

      if (!product || product.isActive === false) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Product not found'
        );
      }

      await feedbackRepository.upsertRating({
        productId,
        userId,
        stars,
        session
      });

      const statistics =
        await feedbackRepository.getRatingStatistics(
          product._id,
          session
        );

      product.averageRating =
        statistics?.averageRating || 0;

      product.ratingCount =
        statistics?.ratingCount || 0;

      await productRepository.save(product, session);

      await enqueueRatingUpdated({
        Outbox,
        product,
        correlationId: requestId,
        session
      });

      return {
        averageRating: product.averageRating,
        ratingCount: product.ratingCount
      };
    });
  }

  return {getSummary, upsert};
}
