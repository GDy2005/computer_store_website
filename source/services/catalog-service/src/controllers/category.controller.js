export function createCategoryController({
  categoryService
}) {
  return {
    async list(req, res, next) {
      try {
        const items = await categoryService.list(
          req.validatedQuery
        );

        res.json({
          success: true,
          data: {items}
        });
      } catch (error) {
        next(error);
      }
    },

    async adminList(req, res, next) {
      try {
        const items =
          await categoryService.listAdmin();

        res.json({
          success: true,
          data: {items}
        });
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await categoryService.create(
          req.body
        );

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
        const data = await categoryService.update(
          req.params.id,
          req.body
        );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async deactivate(req, res, next) {
      try {
        const data =
          await categoryService.deactivate(
            req.params.id
          );

        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}