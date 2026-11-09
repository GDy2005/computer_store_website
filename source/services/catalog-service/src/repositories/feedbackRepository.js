export function createFeedbackRepository({Comment, Rating}) {
  return {
    async listComments({productId, skip, limit}) {
      const filter = {productId, parentCommentId: null};
      const [items, totalItems] = await Promise.all([
        Comment.find(filter)
          .select('+likedBy +dislikedBy')
          .sort({createdAt: -1})
          .skip(skip)
          .limit(limit)
          .lean(),
        Comment.countDocuments(filter)
      ]);

      const parentIds = items.map(item => item._id);
      const replies = parentIds.length
        ? await Comment.find({
            productId,
            parentCommentId: {$in: parentIds}
          })
          .select('+likedBy +dislikedBy')
          .sort({createdAt: 1})
          .lean()
        : [];

      return {items, replies, totalItems};
    },

    async createComment(input, session) {
      const [comment] = await Comment.create([input], {session});
      return comment;
    },

    findComment({productId, commentId}, {session} = {}) {
      const query = Comment.findOne({
        _id: commentId,
        productId
      }).select('+likedBy +dislikedBy');

      return session ? query.session(session) : query;
    },

    updateReaction({
      productId,
      commentId,
      userId,
      reaction,
      session
    }) {
      const update = reaction === 'LIKE'
        ? {
            $addToSet: {likedBy: userId},
            $pull: {dislikedBy: userId}
          }
        : reaction === 'DISLIKE'
          ? {
              $addToSet: {dislikedBy: userId},
              $pull: {likedBy: userId}
            }
          : {
              $pull: {
                likedBy: userId,
                dislikedBy: userId
              }
            };

      return Comment.findOneAndUpdate(
        {_id: commentId, productId},
        update,
        {new: true, session}
      ).select('+likedBy +dislikedBy');
    },

    getRatingDistribution(productId) {
      return Rating.aggregate([
        {$match: {productId}},
        {$group: {_id: '$stars', count: {$sum: 1}}},
        {$sort: {_id: -1}}
      ]);
    },

    findUserRating(productId, userId) {
      return Rating.findOne({productId, userId}).lean();
    },

    upsertRating({productId, userId, stars, session}) {
      return Rating.findOneAndUpdate(
        {productId, userId},
        {$set: {stars}},
        {
          upsert: true,
          new: true,
          runValidators: true,
          session
        }
      );
    },

    async getRatingStatistics(productId, session) {
      const aggregate = Rating.aggregate([
        {$match: {productId}},
        {
          $group: {
            _id: null,
            averageRating: {$avg: '$stars'},
            ratingCount: {$sum: 1}
          }
        }
      ]);

      const result = session && typeof aggregate.session === 'function'
        ? aggregate.session(session)
        : aggregate;
      const [statistics] = await result;
      return statistics || null;
    }
  };
}
