import {
  createHmac,
  timingSafeEqual
} from 'node:crypto';
import {AppError} from '@store/validation';

import {
  enqueueLoyaltyChanged,
  enqueueOrderCancelled,
  enqueueOrderCreated
} from '../events/order.events.js';

const ONLINE_METHODS = new Set(['VNPAY']);

function configured(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireConfiguration(entries, provider) {
  if (entries.every(([, value]) => configured(value))) return;
  throw new AppError(
    503,
    'PAYMENT_NOT_CONFIGURED',
    `${provider} sandbox is not configured`
  );
}

function hmac(algorithm, secret, value) {
  return createHmac(algorithm, secret)
    .update(value, 'utf8')
    .digest('hex');
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left.toLowerCase(), 'utf8');
  const rightBuffer = Buffer.from(right.toLowerCase(), 'utf8');
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function scalar(value, name) {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    String(value).length === 0
  ) {
    throw new AppError(400, 'INVALID_PAYMENT_CALLBACK', `Invalid ${name}`);
  }
  return String(value);
}

function sortedFormData(input) {
  const entries = Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  return new URLSearchParams(entries).toString();
}

function vnpayDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return `${values.year}${values.month}${values.day}` +
    `${values.hour}${values.minute}${values.second}`;
}

function normalizeIp(value) {
  const first = String(value || '127.0.0.1').split(',')[0].trim();
  return first.startsWith('::ffff:') ? first.slice(7) : first;
}

export function createPaymentService({
  connection,
  Order,
  Coupon,
  Outbox,
  loyaltyService
}) {
  const publicBaseUrl = (
    process.env.PAYMENT_PUBLIC_BASE_URL || 'http://localhost'
  ).replace(/\/$/, '');

  function callbackUrl(provider, kind) {
    return `${publicBaseUrl}/api/v1/payments/${provider}/${kind}`;
  }

  function resultUrl({orderNumber, provider, outcome}) {
    const url = new URL(
      `/checkout/${encodeURIComponent(orderNumber)}`,
      `${publicBaseUrl}/`
    );
    url.searchParams.set('payment', outcome);
    url.searchParams.set('provider', provider.toLowerCase());
    return url.toString();
  }

  function createVnpayUrl(order, {ipAddress, locale}) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const paymentUrl = process.env.VNPAY_PAYMENT_URL ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    requireConfiguration([
      ['VNPAY_TMN_CODE', tmnCode],
      ['VNPAY_HASH_SECRET', hashSecret]
    ], 'VNPay');

    const now = new Date();
    const parameters = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: order.pricing.total * 100,
      vnp_CreateDate: vnpayDate(now),
      vnp_ExpireDate: vnpayDate(new Date(now.getTime() + 15 * 60 * 1000)),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: normalizeIp(ipAddress),
      vnp_Locale: locale === 'en' ? 'en' : 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: callbackUrl('vnpay', 'return'),
      vnp_TxnRef: order.payment.gatewayRequestId
    };
    const signData = sortedFormData(parameters);
    const secureHash = hmac('sha512', hashSecret, signData);
    return `${paymentUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  async function create(order, context = {}) {
    if (!ONLINE_METHODS.has(order.payment?.method)) return null;
    if (order.payment.status === 'PAID') return null;
    if (order.payment.status !== 'PENDING') {
      throw new AppError(409, 'PAYMENT_NOT_PENDING', 'Payment is not pending');
    }
    return createVnpayUrl(order, context);
  }

  function verifyVnpay(payload) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    requireConfiguration([
      ['VNPAY_TMN_CODE', tmnCode],
      ['VNPAY_HASH_SECRET', hashSecret]
    ], 'VNPay');

    const secureHash = scalar(payload.vnp_SecureHash, 'vnp_SecureHash');
    const parameters = Object.fromEntries(
      Object.entries(payload)
        .filter(([key, value]) =>
          key.startsWith('vnp_') &&
          !['vnp_SecureHash', 'vnp_SecureHashType'].includes(key) &&
          typeof value === 'string'
        )
    );
    const expected = hmac('sha512', hashSecret, sortedFormData(parameters));
    if (!safeEqual(secureHash, expected) || parameters.vnp_TmnCode !== tmnCode) {
      throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'Invalid VNPay signature');
    }

    return {
      provider: 'VNPAY',
      gatewayRequestId: scalar(parameters.vnp_TxnRef, 'vnp_TxnRef'),
      amount: Number(scalar(parameters.vnp_Amount, 'vnp_Amount')) / 100,
      transactionId: parameters.vnp_TransactionNo || parameters.vnp_BankTranNo,
      responseCode: parameters.vnp_ResponseCode,
      outcome: parameters.vnp_ResponseCode === '00' &&
        parameters.vnp_TransactionStatus === '00'
        ? 'success'
        : 'failed'
    };
  }

  async function releaseCoupon(order, session) {
    if (order.coupon?.status !== 'RESERVED') return;
    await Coupon.updateOne(
      {_id: order.coupon.couponId, usedCount: {$gt: 0}},
      {$inc: {usedCount: -1}},
      {session}
    );
    order.coupon.status = 'RELEASED';
  }

  async function applyResult(result, correlationId) {
    return connection.transaction(async session => {
      const order = await Order.findOne({
        'payment.gatewayRequestId': result.gatewayRequestId,
        'payment.method': result.provider
      }).session(session);
      if (!order) {
        throw new AppError(404, 'PAYMENT_ORDER_NOT_FOUND', 'Payment order not found');
      }
      if (!Number.isSafeInteger(result.amount) || result.amount !== order.pricing.total) {
        throw new AppError(400, 'PAYMENT_AMOUNT_MISMATCH', 'Payment amount mismatch');
      }
      if (result.outcome === 'pending') {
        return {order, outcome: 'pending'};
      }
      if (order.payment.status === 'PAID') {
        return {order, outcome: 'success'};
      }
      if (order.payment.status === 'REFUND_REQUIRED') {
        return {order, outcome: 'success'};
      }
      if (order.payment.status === 'FAILED') {
        return {order, outcome: 'failed'};
      }

      order.payment.responseCode = result.responseCode || null;
      order.payment.transactionId = result.transactionId || null;

      if (result.outcome === 'success') {
        order.payment.status = 'PAID';
        order.payment.paidAt = new Date();
        order.workflowStatus = 'AWAITING_INVENTORY';
        order.statusHistory.push({
          status: 'PENDING',
          note: `${result.provider} payment confirmed; waiting for inventory`
        });
        await order.save({session});
        await enqueueOrderCreated({
          Outbox,
          order,
          correlationId,
          session
        });
        return {order, outcome: 'success'};
      }

      await releaseCoupon(order, session);
      const refund = await loyaltyService.refundRedemption(order, session);
      order.payment.status = 'FAILED';
      order.workflowStatus = 'REJECTED';
      order.status = 'CANCELLED';
      order.cancellationReason = `${result.provider} payment was not completed`;
      order.statusHistory.push({
        status: 'CANCELLED',
        note: order.cancellationReason
      });
      await order.save({session});
      await enqueueOrderCancelled({
        Outbox,
        order,
        reason: order.cancellationReason,
        correlationId,
        session
      });
      if (refund) {
        await enqueueLoyaltyChanged({
          Outbox,
          order,
          transaction: refund,
          correlationId,
          session
        });
      }
      return {order, outcome: 'failed'};
    });
  }

  async function handleVnpay(payload, correlationId) {
    return applyResult(verifyVnpay(payload), correlationId);
  }

  return {
    create,
    handleVnpay,
    resultUrl
  };
}
