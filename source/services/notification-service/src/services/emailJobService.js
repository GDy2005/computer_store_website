import {AppError} from '@store/validation';
import {createEmailJobRepository} from '../repositories/emailJobRepository.js';
import {EmailJobResponseDTO} from '../dto/response/EmailJobResponseDTO.js';

export function createEmailJobService({
  EmailJob,
  emailJobRepository: injectedEmailJobRepository
}) {
  const emailJobRepository = injectedEmailJobRepository ||
    createEmailJobRepository({EmailJob});

  return {
    async getStats() {
      return emailJobRepository.getStats();
    },

    async getByEventId(eventId) {
      const job = await emailJobRepository.findPublicByEventId(eventId);

      if (!job) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'Email job not found'
        );
      }

      return EmailJobResponseDTO.from(job);
    }
  };
}
