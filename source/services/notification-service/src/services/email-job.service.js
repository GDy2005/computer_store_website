import {AppError} from '@store/validation';

export function createEmailJobService({EmailJob}) {
  return {
    async getStats() {
      const [pending, processing, sent, failed] =
        await Promise.all([
          EmailJob.countDocuments({status: 'PENDING'}),
          EmailJob.countDocuments({status: 'PROCESSING'}),
          EmailJob.countDocuments({status: 'SENT'}),
          EmailJob.countDocuments({status: 'FAILED'})
        ]);

      return {pending, processing, sent, failed};
    },

    async getByEventId(eventId) {
      const job = await EmailJob.findOne({eventId})
        .select('-templateData -lastError')
        .lean();

      if (!job) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Email job not found'
        );
      }

      return job;
    }
  };
}
