import {sendSuccess} from '@store/http-response';
import {FeedbackRequestDTO} from '../dto/request/FeedbackRequestDTO.js';

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

        sendSuccess(res, {
          message: 'Rating summary retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async upsert(req, res, next) {
      try {
        const rating = FeedbackRequestDTO.fromRating(req.body);
        const data = await ratingService.upsert({
          productId: req.params.id,
          userId: req.context.userId,
          stars: rating.stars,
          requestId: req.context.requestId
        });

        sendSuccess(res, {
          message: 'Rating saved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
