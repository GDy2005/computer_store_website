export function createUserController(userService) {
  return {
    async getMe(req, res, next) {
      try {
        const data = await userService.getMe(
          req.context.userId
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async updateMe(req, res, next) {
      try {
        const data = await userService.updateMe({
          userId: req.context.userId,
          input: req.body,
          correlationId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async changePassword(req, res, next) {
      try {
        const data = await userService.changePassword({
          userId: req.context.userId,
          ...req.body
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}