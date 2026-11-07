import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPaymentService,
  DEMO_CARD
} from '../services/order-service/src/services/payment.service.js';

const paymentService = createPaymentService();

test('fixed demo card is authorized without returning sensitive card data', () => {
  const result = paymentService.authorize({
    method: 'SIMULATED_CARD',
    card: {
      holderName: ' nguyen van a ',
      cardNumber: '4242 4242 4242 4242',
      expiry: DEMO_CARD.expiry,
      cvv: DEMO_CARD.cvv
    }
  });

  assert.equal(result.method, 'SIMULATED_CARD');
  assert.equal(result.status, 'PAID');
  assert.equal(result.responseCode, 'APPROVED');
  assert.match(result.transactionId, /^SIM-/);
  assert.ok(result.paidAt instanceof Date);
  assert.equal(Object.hasOwn(result, 'card'), false);
  assert.equal(Object.hasOwn(result, 'cardNumber'), false);
  assert.equal(Object.hasOwn(result, 'cvv'), false);
});

test('incorrect demo card is declined', () => {
  assert.throws(
    () => paymentService.authorize({
      method: 'SIMULATED_CARD',
      card: {...DEMO_CARD, cvv: '999'}
    }),
    error => error.code === 'DEMO_CARD_DECLINED' && error.status === 402
  );
});

test('cash on delivery remains pending', () => {
  assert.deepEqual(paymentService.authorize({method: 'COD'}), {
    method: 'COD',
    status: 'PENDING',
    transactionId: null,
    responseCode: null,
    paidAt: null
  });
});
