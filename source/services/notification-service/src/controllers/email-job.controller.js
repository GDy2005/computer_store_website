export function createEmailJobController({emailJobService}) {
  return {
    async stats(req, res, next) {
      try {
        const data = await emailJobService.getStats();
        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    },

    async getByEventId(req, res, next) {
      try {
        const data = await emailJobService.getByEventId(
          req.params.eventId
        );
        res.json({success: true, data});
      } catch (error) {
        next(error);
      }
    }
  };
}
