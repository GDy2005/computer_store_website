import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

import {
  createEvent,
  validateEvent
} from '@store/event-contracts';
import {signedContext} from '@store/validation';
import mongoose from 'mongoose';

import {orderEventPayload} from '../events/order.events.js';
import {getOrderModel} from '../models/order.model.js';
import {seedCoupons} from './seed-coupons.js';

const orderCount = 45;
const cancelledIndexes = new Set([8, 27, 41]);

function getOutboxModel(connection) {
  if (connection.models.Outbox) return connection.models.Outbox;

  const schema = new mongoose.Schema({
    eventId: {type: String, unique: true},
    topic: String,
    key: String,
    payload: mongoose.Schema.Types.Mixed,
    status: {type: String, default: 'PENDING'},
    attempts: {type: Number, default: 0},
    nextAttemptAt: {type: Date, default: Date.now},
    leaseUntil: Date,
    publishedAt: Date,
    createdAt: {type: Date, default: Date.now}
  });

  schema.index({status: 1, nextAttemptAt: 1});
  return connection.model('Outbox', schema, 'outbox_events');
}

async function catalogRequest(path, options = {}) {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  const baseUrl = process.env.CATALOG_SERVICE_URL;
  const requestId = randomUUID();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-internal-token': signedContext(secret, requestId),
      ...options.headers
    }
  });
  const body = await response.json();

  if (!response.ok || !body.success) {
    throw new Error(
      `Catalog seed request failed (${response.status}): ` +
      `${body.error?.message || 'Unknown catalog error'}`
    );
  }

  return body.data;
}

function selectProducts(products, limit = 5) {
  const selected = [];
  const selectedIds = new Set();
  const categories = new Set();

  for (const product of products) {
    const variant = product.variants.find(item =>
      item.isActive && item.availableStock > 0
    );
    const category = product.categoryId?.name || 'Other';

    if (!variant || categories.has(category)) continue;
    selected.push({product, variant});
    selectedIds.add(product._id);
    categories.add(category);
    if (selected.length === limit) return selected;
  }

  for (const product of products) {
    if (selectedIds.has(product._id)) continue;
    const variant = product.variants.find(item =>
      item.isActive && item.availableStock > 0
    );
    if (!variant) continue;
    selected.push({product, variant});
    if (selected.length === limit) return selected;
  }

  return selected;
}

async function loadCatalogSnapshots() {
  const result = await catalogRequest(
    '/api/v1/products?page=1&limit=50&sort=newest'
  );
  const selected = selectProducts(result.items || []);

  if (selected.length < 5) {
    throw new Error('Catalog must provide at least five available products');
  }

  const quote = await catalogRequest('/internal/catalog/quote', {
    method: 'POST',
    body: JSON.stringify({
      items: selected.map(({product, variant}) => ({
        productId: product._id,
        variantId: variant._id,
        quantity: 1
      }))
    })
  });

  return quote.items;
}

function daysAgo(now, days) {
  return new Date(now.getTime() - days * 86400000);
}

function addHours(value, hours) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function finalStatus(index, ageInDays) {
  if (ageInDays === 0) return 'CONFIRMED';
  if (ageInDays === 1) return 'SHIPPING';
  if (cancelledIndexes.has(index)) return 'CANCELLED';
  if (index % 10 < 2) return 'CONFIRMED';
  if (index % 10 < 4) return 'SHIPPING';
  return 'DELIVERED';
}

function statusHistory(status, confirmedAt) {
  const values = [
    {status: 'PENDING', updatedAt: addHours(confirmedAt, -1)},
    {status: 'CONFIRMED', updatedAt: confirmedAt}
  ];

  if (status === 'SHIPPING' || status === 'DELIVERED') {
    values.push({status: 'SHIPPING', updatedAt: addHours(confirmedAt, 4)});
  }
  if (status === 'DELIVERED') {
    values.push({status: 'DELIVERED', updatedAt: addHours(confirmedAt, 28)});
  }
  if (status === 'CANCELLED') {
    values.push({
      status: 'CANCELLED',
      updatedAt: addHours(confirmedAt, 3),
      note: 'Demo customer cancellation'
    });
  }

  return values;
}

export function buildOrder(index, snapshots, now) {
  const snapshot = snapshots[index % snapshots.length];
  const quantity = index % 6 === 0 ? 2 : 1;
  const subtotal = snapshot.unitPrice * quantity;
  const discountAmount = index % 9 === 0
    ? Math.min(200000, subtotal)
    : 0;
  const shippingFee = 30000;
  const total = subtotal - discountAmount + shippingFee;
  const totalCost = snapshot.unitCost * quantity;
  const ageInDays = index % 35;
  const confirmedAt = daysAgo(now, ageInDays);
  const createdAt = addHours(confirmedAt, -1);
  const status = finalStatus(index, ageInDays);
  const usesCard = index % 3 === 0 && status !== 'CANCELLED';
  const sequence = String(index + 1).padStart(6, '0');
  const history = statusHistory(status, confirmedAt);

  return {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: `ORD-DEMO-${sequence}`,
    checkoutId: `demo-checkout-${sequence}`,
    cartId: new mongoose.Types.ObjectId(),
    userId: `demo-customer-${String(index % 8 + 1).padStart(2, '0')}`,
    customer: {
      fullName: `Demo Customer ${index % 8 + 1}`,
      email: `demo-customer-${index % 8 + 1}@example.com`,
      phone: `09000000${String(index % 8 + 1).padStart(2, '0')}`
    },
    shippingAddress: {
      recipientName: `Demo Customer ${index % 8 + 1}`,
      phone: `09000000${String(index % 8 + 1).padStart(2, '0')}`,
      addressLine: `${index + 10} Nguyen Van Linh Street`,
      ward: 'Tan Phong Ward',
      district: 'District 7',
      province: 'Ho Chi Minh City'
    },
    items: [{
      productId: new mongoose.Types.ObjectId(snapshot.productId),
      variantId: new mongoose.Types.ObjectId(snapshot.variantId),
      sku: snapshot.sku,
      productName: snapshot.productName,
      variantName: snapshot.variantName,
      imageUrl: snapshot.imageUrl,
      brand: snapshot.brand,
      categoryName: snapshot.categoryName,
      quantity,
      unitPrice: snapshot.unitPrice,
      unitCost: snapshot.unitCost,
      lineTotal: subtotal
    }],
    pricing: {
      subtotal,
      discountAmount,
      pointsDiscount: 0,
      shippingFee,
      total,
      totalCost,
      profit: total - totalCost
    },
    loyalty: {
      pointsUsed: 0,
      pointsEarned: 0,
      redeemStatus: 'NONE'
    },
    payment: {
      method: usesCard ? 'SIMULATED_CARD' : 'COD',
      status: usesCard ? 'PAID' : 'PENDING',
      transactionId: usesCard ? `DEMO-TXN-${sequence}` : null,
      responseCode: usesCard ? '00' : null,
      paidAt: usesCard ? confirmedAt : null
    },
    workflowStatus: status === 'CANCELLED' ? 'REJECTED' : 'CONFIRMED',
    status,
    cancellationReason: status === 'CANCELLED'
      ? 'Demo customer cancellation'
      : null,
    statusHistory: history,
    createdAt,
    updatedAt: history.at(-1).updatedAt,
    confirmedAt
  };
}

function eventAt(topic, options, occurredAt) {
  const event = {
    ...createEvent(topic, options),
    occurredAt: occurredAt.toISOString()
  };
  return validateEvent(topic, event);
}

export function orderEvents(order) {
  const key = order._id.toString();
  const correlationId = randomUUID();
  const confirmed = eventAt('orders.confirmed.v1', {
    producer: 'order-service',
    key,
    correlationId,
    payload: orderEventPayload(order)
  }, order.confirmedAt);
  const events = [{topic: 'orders.confirmed.v1', event: confirmed}];

  if (order.status === 'SHIPPING' || order.status === 'DELIVERED') {
    const shippingAt = addHours(order.confirmedAt, 4);
    events.push({
      topic: 'orders.status-changed.v1',
      event: eventAt('orders.status-changed.v1', {
        producer: 'order-service',
        key,
        correlationId,
        causationId: confirmed.eventId,
        payload: {
          orderId: key,
          orderNumber: order.orderNumber,
          previousStatus: 'CONFIRMED',
          status: 'SHIPPING'
        }
      }, shippingAt)
    });
  }

  if (order.status === 'DELIVERED') {
    events.push({
      topic: 'orders.status-changed.v1',
      event: eventAt('orders.status-changed.v1', {
        producer: 'order-service',
        key,
        correlationId,
        causationId: confirmed.eventId,
        payload: {
          orderId: key,
          orderNumber: order.orderNumber,
          previousStatus: 'SHIPPING',
          status: 'DELIVERED'
        }
      }, addHours(order.confirmedAt, 28))
    });
  }

  if (order.status === 'CANCELLED') {
    const cancelledAt = addHours(order.confirmedAt, 3);
    events.push({
      topic: 'orders.cancelled.v1',
      event: eventAt('orders.cancelled.v1', {
        producer: 'order-service',
        key,
        correlationId,
        causationId: confirmed.eventId,
        payload: {
          orderId: key,
          orderNumber: order.orderNumber,
          reason: order.cancellationReason
        }
      }, cancelledAt)
    });
  }

  return events;
}

export async function seedOrderData() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (!process.env.CATALOG_SERVICE_URL) {
    throw new Error('CATALOG_SERVICE_URL is required');
  }
  if (!process.env.INTERNAL_SERVICE_SECRET) {
    throw new Error('INTERNAL_SERVICE_SECRET is required');
  }
  if (process.env.DB_NAME && process.env.DB_NAME !== 'order_db') {
    throw new Error('Order seed may only write order_db');
  }

  const connection = await mongoose.createConnection(
    process.env.MONGODB_URI,
    {dbName: 'order_db'}
  ).asPromise();

  try {
    const Order = getOrderModel(connection);
    const Outbox = getOutboxModel(connection);
    await Promise.all([Order.init(), Outbox.init()]);
    await seedCoupons(connection);

    const existingDemoOrder = await Order.exists({
      orderNumber: /^ORD-DEMO-/
    });
    if (existingDemoOrder) {
      console.log('Skipped demo orders because demo orders already exist');
      return;
    }

    const snapshots = await loadCatalogSnapshots();
    const now = new Date();
    const orders = Array.from(
      {length: orderCount},
      (_, index) => buildOrder(index, snapshots, now)
    );

    await connection.transaction(async session => {
      const storedOrders = await Order.create(
        orders.map(({confirmedAt, ...order}) => order),
        {session, ordered: true}
      );
      const outboxRows = storedOrders.flatMap((order, index) => {
        const seedOrder = {
          ...order.toObject(),
          confirmedAt: orders[index].confirmedAt
        };
        return orderEvents(seedOrder).map(({topic, event}) => ({
          eventId: event.eventId,
          topic,
          key: order._id.toString(),
          payload: event,
          status: 'PENDING',
          nextAttemptAt: new Date(),
          createdAt: new Date(event.occurredAt)
        }));
      });

      await Outbox.create(outboxRows, {session, ordered: true});
    });

    console.log(
      `Seeded ${orders.length} demo orders and their analytics events`
    );
  } finally {
    await connection.close();
  }
}

if (process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await seedOrderData();
}
