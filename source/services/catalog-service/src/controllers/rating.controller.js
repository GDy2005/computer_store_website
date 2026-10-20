export function createRatingController({
  ratingService
}) {
  return {
    async summary(req, res, next) {
      try {
        const data =
          await ratingService.getSummary(
            req.params.id,
            req.context.userId
          );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async upsert(req, res, next) {
      try {
        const data = await ratingService.upsert({
          productId: req.params.id,
          userId: req.context.userId,
          stars: req.body.stars,
          requestId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
