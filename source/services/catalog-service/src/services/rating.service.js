import {AppError} from '@store/validation';

import {
  enqueueRatingUpdated
} from '../events/catalog-events.js';

export function createRatingService({
  connection,
  Product,
  Rating,
  Outbox,
  identityClient
}) {
  async function getSummary(productId, userId = null) {
    const product = await Product.findOne({
      _id: productId,
      isActive: true
    })
      .select('averageRating ratingCount')
      .lean();

    if (!product) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Product not found'
      );
    }

    const [distribution, userRating] = await Promise.all([
      Rating.aggregate([
        {$match: {productId: product._id}},
        {$group: {_id: '$stars', count: {$sum: 1}}},
        {$sort: {_id: -1}}
      ]),
      userId
        ? Rating.findOne({productId: product._id, userId}).lean()
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
      const product = await Product.findOne({
        _id: productId,
        isActive: true
      }).session(session);

      if (!product) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Product not found'
        );
      }

      await Rating.findOneAndUpdate(
        {productId, userId},
        {$set: {stars}},
        {
          upsert: true,
          new: true,
          runValidators: true,
          session
        }
      );

      const [statistics] = await Rating.aggregate([
        {$match: {productId: product._id}},
        {
          $group: {
            _id: null,
            averageRating: {$avg: '$stars'},
            ratingCount: {$sum: 1}
          }
        }
      ]).session(session);

      product.averageRating =
        statistics?.averageRating || 0;

      product.ratingCount =
        statistics?.ratingCount || 0;

      await product.save({session});

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
