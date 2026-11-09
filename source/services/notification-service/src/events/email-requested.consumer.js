import {
  createEmailJobRepository
} from '../repositories/emailJobRepository.js';

export function createEmailRequestedHandler({
  emailJobRepository: injectedEmailJobRepository,
  EmailJob
}) {
  const emailJobRepository = injectedEmailJobRepository ||
    createEmailJobRepository({EmailJob});
  return async function handleEmailRequested(event, session) {
    await emailJobRepository.enqueue(
      event.eventId,
      {
        recipientEmail: event.payload.recipientEmail,
        template: event.payload.type,
        templateData: event.payload.templateData,
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date()
      },
      session
    );
  };
}
