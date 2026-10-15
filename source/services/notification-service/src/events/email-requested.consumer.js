export function createEmailRequestedHandler({EmailJob}) {
  return async function handleEmailRequested(event, session) {
    await EmailJob.updateOne(
      {eventId: event.eventId},
      {
        $setOnInsert: {
          eventId: event.eventId,
          recipientEmail: event.payload.recipientEmail,
          template: event.payload.type,
          templateData: event.payload.templateData,
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date()
        }
      },
      {upsert: true, session}
    );
  };
}
