import {randomUUID, timingSafeEqual} from 'node:crypto';
import {AppError} from '@store/validation';

export const DEMO_CARD = Object.freeze({
  holderName: 'NGUYEN VAN A',
  cardNumber: '4242424242424242',
  expiry: '12/30',
  cvv: '123'
});

function normalizeCard(card = {}) {
  return {
    holderName: String(card.holderName || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase(),
    cardNumber: String(card.cardNumber || '')
      .replace(/[\s-]/g, ''),
    expiry: String(card.expiry || '').trim(),
    cvv: String(card.cvv || '').trim()
  };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function demoCardMatches(card) {
  const normalized = normalizeCard(card);

  return Object.entries(DEMO_CARD).every(
    ([field, expected]) => safeEqual(normalized[field], expected)
  );
}

export function createPaymentService() {
  function authorize({method, card}) {
    if (method === 'COD') {
      return {
        method,
        status: 'PENDING',
        transactionId: null,
        responseCode: null,
        paidAt: null
      };
    }

    if (method !== 'SIMULATED_CARD') {
      throw new AppError(
        400,
        'INVALID_PAYMENT_METHOD',
        'Invalid payment method'
      );
    }

    if (!demoCardMatches(card)) {
      throw new AppError(
        402,
        'DEMO_CARD_DECLINED',
        'Demo card information is incorrect'
      );
    }

    return {
      method,
      status: 'PAID',
      transactionId: `SIM-${randomUUID().replaceAll('-', '').toUpperCase()}`,
      responseCode: 'APPROVED',
      paidAt: new Date()
    };
  }

  return {authorize};
}
