export function createSearchController({searchService}) {
  return {
    async list(req, res, next) {
      try {
        const result = await searchService.search(
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
    }
  };
}
