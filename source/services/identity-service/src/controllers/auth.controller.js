export function createAuthController(authService) {
  return {
    async register(req, res, next) {
      try {
        const data = await authService.register({
          input: req.body,
          correlationId: req.context.requestId
        });

        res.status(201).json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async activate(req, res, next) {
      try {
        const data = await authService.activate(req.body);
        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async verifyCredentials(req, res, next) {
      try {
        const data =
          await authService.verifyCredentials(req.body);

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async resolveGoogleUser(req, res, next) {
      try {
        const data = await authService.resolveGoogleUser({
          ...req.body,
          correlationId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async forgotPassword(req, res, next) {
      try {
        const data = await authService.forgotPassword({
          email: req.body.email,
          correlationId: req.context.requestId
        });

        res.status(202).json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async resetPassword(req, res, next) {
      try {
        const data =
          await authService.resetPassword(req.body);

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
