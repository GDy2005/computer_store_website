export function createProductController({
  productService
}) {
  return {
    async list(req, res, next) {
      try {
        const result =
          await productService.listPublic(
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

    async detail(req, res, next) {
      try {
        const data =
          await productService.getPublicBySlug(
            req.params.slug
          );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async filters(req, res, next) {
      try {
        const data =
          await productService.getPublicFilters();

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async adminList(req, res, next) {
      try {
        const result =
          await productService.listAdmin(
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

    async adminDetail(req, res, next) {
      try {
        const data =
          await productService.getAdminById(
            req.params.id
          );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await productService.create({
          input: req.body,
          correlationId: req.context.requestId
        });

        res.status(201).json({
          success: true,
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await productService.update({
          productId: req.params.id,
          input: req.body,
          correlationId: req.context.requestId
        });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async deactivate(req, res, next) {
      try {
        const data =
          await productService.deactivate({
            productId: req.params.id,
            correlationId: req.context.requestId
          });

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
