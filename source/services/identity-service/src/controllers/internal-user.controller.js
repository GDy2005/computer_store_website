export function createInternalUserController({
  internalUserService
}) {
  return {
    async getSummary(req, res, next) {
      try {
        const data =
          await internalUserService.getSummary(
            req.params.id
          );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async resolveCheckout(req, res, next) {
      try {
        const data =
          await internalUserService.resolveCheckout({
            input: req.body,
            correlationId: req.context.requestId
          });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
