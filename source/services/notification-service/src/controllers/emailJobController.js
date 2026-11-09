import {sendSuccess} from '@store/http-response';

export function createEmailJobController({emailJobService}) {
  return {
    async stats(req, res, next) {
      try {
        const data = await emailJobService.getStats();
        sendSuccess(res, {
          message: 'Email job statistics retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    },

    async getByEventId(req, res, next) {
      try {
        const data = await emailJobService.getByEventId(
          req.params.eventId
        );
        sendSuccess(res, {
          message: 'Email job retrieved successfully',
          data
        });
      } catch (error) {
        next(error);
      }
    }
  };
}
