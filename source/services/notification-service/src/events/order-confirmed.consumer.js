import {
  createEmailJobRepository
} from '../repositories/emailJobRepository.js';

function createShopUrl() {
  try {
    return new URL('/products', process.env.FRONTEND_URL || 'http://localhost').toString();
  } catch {
    return 'http://localhost/products';
  }
}

export function createOrderConfirmedHandler({
  emailJobRepository: injectedEmailJobRepository,
  EmailJob
}) {
  const emailJobRepository = injectedEmailJobRepository ||
    createEmailJobRepository({EmailJob});
  return async function handleOrderConfirmed(event, session) {
    if (event.payload.orderNumber.startsWith('ORD-DEMO-')) {
      return;
    }

    await emailJobRepository.enqueue(
      event.eventId,
      {
        recipientEmail: event.payload.customer.email,
        template: 'ORDER_CONFIRMATION',
        templateData: {
          fullName: event.payload.customer.fullName,
          orderNumber: event.payload.orderNumber,
          items: (event.payload.items || []).map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            lineTotal: item.lineTotal
          })),
          total: event.payload.pricing?.total,
          shopUrl: createShopUrl()
        },
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date()
      },
      session
    );
  };
}
