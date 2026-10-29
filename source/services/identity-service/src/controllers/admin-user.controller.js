export function createAdminUserController({
  adminUserService
}) {
  return {
    async list(req, res, next) {
      try {
        const result = await adminUserService.list(
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

    async update(req, res, next) {
      try {
        const data = await adminUserService.update({
          userId: req.params.id,
          input: req.body,
          correlationId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async setBan(req, res, next) {
      try {
        const data = await adminUserService.setBan({
          userId: req.params.id,
          isBanned: req.body.isBanned,
          correlationId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
