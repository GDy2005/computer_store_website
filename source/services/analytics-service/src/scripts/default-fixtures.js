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

function productPayload({productId, name, categoryId, unitPrice}) {
  return {
    productId,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    description: `${name} analytics demo product`,
    brand: 'Demo Brand',
    categoryId,
    tags: ['demo'],
    minPrice: unitPrice,
    maxPrice: Math.round(unitPrice * 1.15),
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
  const products = [
    {
      productId: '507f1f77bcf86cd799439201',
      categoryId: '507f1f77bcf86cd799439301',
      name: 'Demo Laptop Pro',
      categoryName: 'Laptop',
      unitPrice: 24500000,
      unitCost: 19800000
    },
    {
      productId: '507f1f77bcf86cd799439202',
      categoryId: '507f1f77bcf86cd799439302',
      name: 'Demo Mechanical Keyboard',
      categoryName: 'Keyboard',
      unitPrice: 2850000,
      unitCost: 1920000
    },
    {
      productId: '507f1f77bcf86cd799439203',
      categoryId: '507f1f77bcf86cd799439303',
      name: 'Demo Gaming Monitor',
      categoryName: 'Monitor',
      unitPrice: 7990000,
      unitCost: 6150000
    },
    {
      productId: '507f1f77bcf86cd799439204',
      categoryId: '507f1f77bcf86cd799439304',
      name: 'Demo Wireless Mouse',
      categoryName: 'Mouse',
      unitPrice: 2190000,
      unitCost: 1430000
    },
    {
      productId: '507f1f77bcf86cd799439205',
      categoryId: '507f1f77bcf86cd799439305',
      name: 'Demo NVMe SSD 1TB',
      categoryName: 'SSD and Storage',
      unitPrice: 3290000,
      unitCost: 2360000
    }
  ];

  const userDays = [35, 27, 21, 15, 9, 5, 2, 0];
  const events = userDays.map((days, index) => {
    const fixtureUserId = index === 0
      ? userId
      : `507f1f77bcf86cd7${String(99439101 + index).padStart(8, '0')}`;
    return occurredAt('users.created.v1', {
      producer: 'identity-service',
      key: fixtureUserId,
      correlationId: 'analytics-fixture',
      payload: {
        userId: fixtureUserId,
        email: index === 0
          ? 'analytics-demo@example.com'
          : `analytics-demo-${index + 1}@example.com`,
        fullName: `Demo Customer ${index + 1}`,
        role: 'CUSTOMER',
        accountStatus: 'ACTIVE'
      }
    }, daysAgo(now, days));
  });

  for (const product of products) {
    events.push(occurredAt('products.created.v1', {
      producer: 'catalog-service',
      key: product.productId,
      correlationId: 'analytics-fixture',
      payload: productPayload(product)
    }, daysAgo(now, 60)));
  }

  events.push(occurredAt('ratings.updated.v1', {
    producer: 'catalog-service',
    key: products[0].productId,
    correlationId: 'analytics-fixture',
    payload: {
      productId: products[0].productId,
      averageRating: 4.5,
      ratingCount: 12
    }
  }, daysAgo(now, 10)));

  const orders = Array.from({length: 45}, (_, index) => {
    const product = products[index % products.length];
    const quantity = index % 6 === 0 ? 2 : 1;
    const lineTotal = product.unitPrice * quantity;
    const discount = index % 9 === 0 ? Math.min(200000, lineTotal) : 0;
    const total = lineTotal + 30000 - discount;

    return {
      orderId: `507f1f77bcf86cd7${String(99439401 + index).padStart(8, '0')}`,
      orderNumber: `ORD-DEMO-${String(index + 1).padStart(6, '0')}`,
      days: index % 35,
      product: {
        productId: product.productId,
        productName: product.name,
        categoryName: product.categoryName,
        quantity,
        unitPrice: product.unitPrice,
        unitCost: product.unitCost,
        total
      }
    };
  });

  for (const order of orders) {
    events.push(occurredAt('orders.confirmed.v1', {
      producer: 'order-service',
      key: order.orderId,
      correlationId: 'analytics-fixture',
      payload: confirmedPayload({...order, userId})
    }, daysAgo(now, order.days)));
  }

  const cancelledOrders = [orders[8], orders[27], orders[41]];
  for (const order of cancelledOrders) {
    events.push(occurredAt('orders.cancelled.v1', {
      producer: 'order-service',
      key: order.orderId,
      correlationId: 'analytics-fixture',
      payload: {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        reason: 'Cancelled analytics fixture'
      }
    }, daysAgo(now, Math.max(0, order.days - 1))));
  }

  return events;
}
