import {sendSuccess} from '@store/http-response';
import {FeedbackRequestDTO} from '../dto/request/FeedbackRequestDTO.js';

export function createCommentController({
  commentService
}) {
  return {
    async list(req, res, next) {
      try {
        const result = await commentService.list(
          req.params.id,
          req.validatedQuery,
          req.context.userId
        );

        sendSuccess(res, {
          message: 'Comments retrieved successfully',
          data: result
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await commentService.create({
          productId: req.params.id,
          input: FeedbackRequestDTO.fromComment(req.body),
          userId: req.context.userId,
          requestId: req.context.requestId
        });

        sendSuccess(res, {
          status: 201,
          message: 'Comment created successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async react(req, res, next) {
      try {
        const data = await commentService.react({
          productId: req.params.id,
          commentId: req.params.commentId,
          userId: req.context.userId,
          ...FeedbackRequestDTO.fromReaction(req.body)
        });

        sendSuccess(res, {
          message: 'Comment reaction updated successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
