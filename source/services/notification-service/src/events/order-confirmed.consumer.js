export function createOrderConfirmedHandler({EmailJob}) {
  return async function handleOrderConfirmed(event, session) {
    await EmailJob.updateOne(
      {eventId: event.eventId},
      {
        $setOnInsert: {
          eventId: event.eventId,
          recipientEmail: event.payload.customer.email,
          template: 'ORDER_CONFIRMATION',
          templateData: {
            fullName: event.payload.customer.fullName,
            orderNumber: event.payload.orderNumber
          },
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date()
        }
      },
      {upsert: true, session}
    );
  };
}
