import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import test from 'node:test';

import {
  createPaymentService
} from '../services/order-service/src/services/payment.service.js';

const paymentEnvironment = [
  'PAYMENT_PUBLIC_BASE_URL',
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'VNPAY_PAYMENT_URL'
];

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(
    paymentEnvironment.map(key => [key, process.env[key]])
  );
  Object.assign(process.env, values);
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

function order(method) {
  return {
    orderNumber: 'ORD-20261104-A1B2C3',
    pricing: {total: 1250000},
    payment: {
      method,
      status: 'PENDING',
      gatewayRequestId: 'ORD20261104A1B2C3'
    }
  };
}

function service() {
  return createPaymentService({
    connection: null,
    Order: null,
    Coupon: null,
    Outbox: null,
    loyaltyService: null
  });
}

function signVnpay(payload, secret) {
  const entries = Object.entries(payload)
    .map(([key, value]) => [key, String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  return createHmac('sha512', secret)
    .update(new URLSearchParams(entries).toString(), 'utf8')
    .digest('hex');
}

test('VNPay sandbox URL contains a signed server-calculated amount', () =>
  withEnvironment({
    PAYMENT_PUBLIC_BASE_URL: 'https://shop.example.test',
    VNPAY_TMN_CODE: 'TESTCODE',
    VNPAY_HASH_SECRET: 'test-hash-secret',
    VNPAY_PAYMENT_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
  }, async () => {
    const paymentUrl = await service().create(order('VNPAY'), {
      ipAddress: '127.0.0.1',
      locale: 'vi'
    });
    const url = new URL(paymentUrl);
    const suppliedHash = url.searchParams.get('vnp_SecureHash');
    url.searchParams.delete('vnp_SecureHash');
    const entries = [...url.searchParams.entries()]
      .sort(([left], [right]) => left.localeCompare(right));
    const signData = new URLSearchParams(entries).toString();
    const expectedHash = createHmac('sha512', 'test-hash-secret')
      .update(signData, 'utf8')
      .digest('hex');

    assert.equal(url.origin, 'https://sandbox.vnpayment.vn');
    assert.equal(url.searchParams.get('vnp_TmnCode'), 'TESTCODE');
    assert.equal(url.searchParams.get('vnp_Amount'), '125000000');
    assert.equal(url.searchParams.get('vnp_TxnRef'), 'ORD20261104A1B2C3');
    assert.equal(
      url.searchParams.get('vnp_ReturnUrl'),
      'https://shop.example.test/api/v1/payments/vnpay/return'
    );
    assert.equal(suppliedHash, expectedHash);
  }));

test('payment methods fail closed when sandbox credentials are missing', () =>
  withEnvironment({
    VNPAY_TMN_CODE: '',
    VNPAY_HASH_SECRET: ''
  }, async () => {
    await assert.rejects(
      service().create(order('VNPAY'), {}),
      error => error.code === 'PAYMENT_NOT_CONFIGURED' && error.status === 503
    );
  }));

test('valid VNPay callback marks the order paid before inventory processing', () =>
  withEnvironment({
    PAYMENT_PUBLIC_BASE_URL: 'https://shop.example.test',
    VNPAY_TMN_CODE: 'TESTCODE',
    VNPAY_HASH_SECRET: 'test-hash-secret'
  }, async () => {
    const rows = [];
    const persistedOrder = {
      _id: {toString: () => '507f1f77bcf86cd799439011'},
      orderNumber: 'ORD-20261104-A1B2C3',
      userId: 'user-1',
      customer: {
        fullName: 'Nguyen Van A',
        email: 'user@example.com',
        phone: '0900000000'
      },
      items: [{
        productId: {toString: () => '507f191e810c19729de860ea'},
        variantId: {toString: () => '507f191e810c19729de860eb'},
        quantity: 1,
        productName: 'Laptop',
        categoryName: 'Laptop',
        unitPrice: 1250000,
        unitCost: 1000000,
        lineTotal: 1250000
      }],
      pricing: {total: 1250000, totalCost: 1000000, profit: 250000},
      payment: {method: 'VNPAY', status: 'PENDING'},
      workflowStatus: 'AWAITING_PAYMENT',
      statusHistory: [],
      async save() {}
    };
    const paymentService = createPaymentService({
      connection: {transaction: handler => handler({})},
      Order: {
        findOne() {
          return {session: async () => persistedOrder};
        }
      },
      Coupon: null,
      Outbox: {async create(events) { rows.push(...events); }},
      loyaltyService: {async refundRedemption() {}},
      fetchImpl: null
    });
    const callback = {
      vnp_Amount: '125000000',
      vnp_BankCode: 'NCB',
      vnp_ResponseCode: '00',
      vnp_TmnCode: 'TESTCODE',
      vnp_TransactionNo: '14587422',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: 'ORD20261104A1B2C3'
    };
    callback.vnp_SecureHash = signVnpay(callback, 'test-hash-secret');

    const result = await paymentService.handleVnpay(callback, 'request-1');

    assert.equal(result.outcome, 'success');
    assert.equal(persistedOrder.payment.status, 'PAID');
    assert.equal(persistedOrder.payment.transactionId, '14587422');
    assert.equal(persistedOrder.workflowStatus, 'AWAITING_INVENTORY');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].topic, 'orders.created.v1');
  }));
