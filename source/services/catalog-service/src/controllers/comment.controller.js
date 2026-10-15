export function createCommentController({
  commentService
}) {
  return {
    async list(req, res, next) {
      try {
        const result = await commentService.list(
          req.params.id,
          req.validatedQuery
        );

        res.json({
          success: true,
          data: {items: result.items},
          meta: result.meta
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await commentService.create({
          productId: req.params.id,
          input: req.body,
          userId: req.context.userId,
          requestId: req.context.requestId
        });

        res.status(201).json({
          success: true,
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}