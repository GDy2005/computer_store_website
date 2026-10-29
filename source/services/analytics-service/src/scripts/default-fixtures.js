import {createEvent} from '@store/event-contracts';

function occurredAt(topic, options, date) {
  return {
    topic,
    event: {
      ...createEvent(topic, options),
      occurredAt: date.toISOString()
    }
  };
}

function daysAgo(now, days) {
  return new Date(now.getTime() - days * 86400000);
}

function productPayload(productId, name, categoryId) {
  return {
    productId,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description: `${name} analytics demo product`,
    brand: 'Demo Brand',
    categoryId,
    tags: ['demo'],
    minPrice: 10000000,
    maxPrice: 12000000,
    averageRating: 4.5,
    isActive: true
  };
}

function confirmedPayload({orderId, orderNumber, userId, product}) {
  return {
    orderId,
    orderNumber,
    userId,
    customer: {
      fullName: 'Demo Customer',
      email: 'analytics-demo@example.com',
      phone: '0900000000'
    },
    items: [{
      productId: product.productId,
      variantId: `${product.productId.slice(0, 22)}01`,
      quantity: product.quantity,
      productName: product.productName,
      categoryName: product.categoryName,
      unitPrice: product.unitPrice,
      unitCost: product.unitCost,
      lineTotal: product.unitPrice * product.quantity
    }],
    pricing: {
      total: product.total,
      totalCost: product.unitCost * product.quantity,
      profit: product.total - product.unitCost * product.quantity
    }
  };
}

export function buildDefaultAnalyticsFixtures(now = new Date()) {
  const userId = '507f1f77bcf86cd799439101';
  const laptopId = '507f1f77bcf86cd799439201';
  const keyboardId = '507f1f77bcf86cd799439202';
  const laptop = productPayload(
    laptopId,
    'Demo Laptop Pro',
    '507f1f77bcf86cd799439301'
  );
  const keyboard = productPayload(
    keyboardId,
    'Demo Mechanical Keyboard',
    '507f1f77bcf86cd799439302'
  );
  const base = {
    producer: 'identity-service',
    key: userId,
    correlationId: 'analytics-fixture'
  };

  const events = [
    occurredAt('users.created.v1', {
      ...base,
      payload: {
        userId,
        email: 'analytics-demo@example.com',
        fullName: 'Demo Customer',
        role: 'CUSTOMER',
        accountStatus: 'ACTIVE'
      }
    }, daysAgo(now, 35)),
    occurredAt('products.created.v1', {
      producer: 'catalog-service',
      key: laptopId,
      correlationId: 'analytics-fixture',
      payload: laptop
    }, daysAgo(now, 60)),
    occurredAt('users.created.v1', {
      producer: 'identity-service',
      key: '507f1f77bcf86cd799439102',
      correlationId: 'analytics-fixture',
      payload: {
        userId: '507f1f77bcf86cd799439102',
        email: 'analytics-new@example.com',
        fullName: 'New Demo Customer',
        role: 'CUSTOMER',
        accountStatus: 'ACTIVE'
      }
    }, daysAgo(now, 3)),
    occurredAt('products.created.v1', {
      producer: 'catalog-service',
      key: keyboardId,
      correlationId: 'analytics-fixture',
      payload: keyboard
    }, daysAgo(now, 60)),
    occurredAt('ratings.updated.v1', {
      producer: 'catalog-service',
      key: laptopId,
      correlationId: 'analytics-fixture',
      payload: {
        productId: laptopId,
        averageRating: 4.5,
        ratingCount: 12
      }
    }, daysAgo(now, 10))
  ];

  const orders = [
    {
      orderId: '507f1f77bcf86cd799439401',
      orderNumber: 'ORD-20261001-AA0001',
      days: 18,
      product: {
        productId: laptopId,
        productName: laptop.name,
        categoryName: 'Laptop',
        quantity: 1,
        unitPrice: 12000000,
        unitCost: 9000000,
        total: 12030000
      }
    },
    {
      orderId: '507f1f77bcf86cd799439402',
      orderNumber: 'ORD-20261002-AA0002',
      days: 5,
      product: {
        productId: keyboardId,
        productName: keyboard.name,
        categoryName: 'Keyboard',
        quantity: 2,
        unitPrice: 1800000,
        unitCost: 1200000,
        total: 3630000
      }
    },
    {
      orderId: '507f1f77bcf86cd799439403',
      orderNumber: 'ORD-20261003-AA0003',
      days: 12,
      product: {
        productId: keyboardId,
        productName: keyboard.name,
        categoryName: 'Keyboard',
        quantity: 1,
        unitPrice: 1800000,
        unitCost: 1200000,
        total: 1830000
      }
    }
  ];

  for (const order of orders) {
    events.push(occurredAt('orders.confirmed.v1', {
      producer: 'order-service',
      key: order.orderId,
      correlationId: 'analytics-fixture',
      payload: confirmedPayload({...order, userId})
    }, daysAgo(now, order.days)));
  }

  const cancelled = orders[2];
  events.push(occurredAt('orders.cancelled.v1', {
    producer: 'order-service',
    key: cancelled.orderId,
    correlationId: 'analytics-fixture',
    payload: {
      orderId: cancelled.orderId,
      orderNumber: cancelled.orderNumber,
      reason: 'Cancelled analytics fixture'
    }
  }, daysAgo(now, 2)));

  return events;
}
