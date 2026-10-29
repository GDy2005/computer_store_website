import {dateKey} from './date-buckets.js';

const statusRank = {
  CONFIRMED: 1,
  SHIPPING: 2,
  DELIVERED: 3,
  CANCELLED: 4
};

function allocateAmount(items, amount) {
  const weights = items.map(item => item.lineTotal || item.quantity);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let allocated = 0;

  return items.map((item, index) => {
    if (index === items.length - 1) return amount - allocated;
    const share = totalWeight === 0
      ? 0
      : Math.trunc(amount * weights[index] / totalWeight);
    allocated += share;
    return share;
  });
}

export function allocateOrderItems(payload) {
  const revenueShares = allocateAmount(payload.items, payload.pricing.total);
  const profitShares = allocateAmount(payload.items, payload.pricing.profit);
  const products = new Map();

  payload.items.forEach((item, index) => {
    const current = products.get(item.productId) || {
      productId: item.productId,
      productName: item.productName,
      categoryName: item.categoryName,
      quantity: 0,
      revenue: 0,
      profit: 0
    };
    current.quantity += item.quantity;
    current.revenue += revenueShares[index];
    current.profit += profitShares[index];
    products.set(item.productId, current);
  });

  return [...products.values()];
}

async function findOne(Model, filter, session) {
  return Model.findOne(filter).session(session);
}

async function createOne(Model, value, session) {
  const [document] = await Model.create([value], {session});
  return document;
}

async function incrementDashboard(
  Model,
  keyName,
  key,
  delta,
  session
) {
  await Model.updateOne(
    {[keyName]: key},
    {
      $setOnInsert: {[keyName]: key},
      $inc: delta
    },
    {upsert: true, session}
  );
}

export function createAnalyticsProjector({
  DashboardDaily,
  DashboardMonthly,
  ProductSales,
  OrderProjection,
  UserProjection,
  ProductProjection
}) {
  async function updateSales(order, multiplier, session) {
    const delta = {
      orderCount: multiplier,
      revenue: multiplier * order.revenue,
      profit: multiplier * order.profit,
      productsSold: multiplier * order.productsSold
    };

    await incrementDashboard(
      DashboardDaily,
      'date',
      order.confirmedDate,
      delta,
      session
    );
    await incrementDashboard(
      DashboardMonthly,
      'month',
      order.confirmedMonth,
      delta,
      session
    );

    for (const item of order.items) {
      await ProductSales.updateOne(
        {date: order.confirmedDate, productId: item.productId},
        {
          $setOnInsert: {
            date: order.confirmedDate,
            productId: item.productId
          },
          $set: {
            productName: item.productName,
            categoryName: item.categoryName
          },
          $inc: {
            quantity: multiplier * item.quantity,
            revenue: multiplier * item.revenue,
            profit: multiplier * item.profit,
            orderCount: multiplier
          }
        },
        {upsert: true, session}
      );
    }
  }

  async function userCreated(event, session) {
    const {userId, role} = event.payload;
    let user = await findOne(UserProjection, {userId}, session);
    if (!user) {
      user = await createOne(UserProjection, {userId, role}, session);
    }
    if (user.counted) return;

    const createdDate = dateKey(event.occurredAt);
    user.role = role;
    user.createdDate = createdDate;
    user.counted = true;
    await user.save({session});

    await incrementDashboard(
      DashboardDaily,
      'date',
      createdDate,
      {newUsers: 1},
      session
    );
    await incrementDashboard(
      DashboardMonthly,
      'month',
      createdDate.slice(0, 7),
      {newUsers: 1},
      session
    );
  }

  async function userUpdated(event, session) {
    await UserProjection.updateOne(
      {userId: event.payload.userId},
      {
        $setOnInsert: {userId: event.payload.userId},
        $set: {isBanned: event.payload.isBanned}
      },
      {upsert: true, session}
    );
  }

  async function productChanged(event, session) {
    const product = event.payload;
    await ProductProjection.updateOne(
      {productId: product.productId},
      {
        $setOnInsert: {productId: product.productId},
        $set: {
          slug: product.slug,
          name: product.name,
          categoryId: product.categoryId,
          isActive: product.isActive,
          averageRating: product.averageRating
        }
      },
      {upsert: true, session}
    );
  }

  async function ratingUpdated(event, session) {
    await ProductProjection.updateOne(
      {productId: event.payload.productId},
      {
        $setOnInsert: {productId: event.payload.productId},
        $set: {
          averageRating: event.payload.averageRating,
          ratingCount: event.payload.ratingCount
        }
      },
      {upsert: true, session}
    );
  }

  async function orderConfirmed(event, session) {
    const payload = event.payload;
    let order = await findOne(
      OrderProjection,
      {orderId: payload.orderId},
      session
    );
    if (!order) {
      order = await createOne(OrderProjection, {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber
      }, session);
    }

    if (order.counted) return;

    const confirmedDate = dateKey(event.occurredAt);
    order.orderNumber = payload.orderNumber;
    order.confirmedDate = confirmedDate;
    order.confirmedMonth = confirmedDate.slice(0, 7);
    order.revenue = payload.pricing.total;
    order.profit = payload.pricing.profit;
    order.productsSold = payload.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    order.items = allocateOrderItems(payload);

    const occurredAt = new Date(event.occurredAt);
    if (
      !order.cancelled &&
      !['SHIPPING', 'DELIVERED'].includes(order.status) &&
      (!order.lastStatusAt || occurredAt >= order.lastStatusAt)
    ) {
      order.status = 'CONFIRMED';
      order.lastStatusAt = occurredAt;
    }

    if (order.cancelled) {
      await order.save({session});
      return;
    }

    order.counted = true;
    await order.save({session});
    await updateSales(order, 1, session);
  }

  async function orderCancelled(event, session) {
    const {orderId, orderNumber} = event.payload;
    let order = await findOne(OrderProjection, {orderId}, session);
    if (!order) {
      order = await createOne(OrderProjection, {
        orderId,
        orderNumber: orderNumber || null,
        status: 'CANCELLED',
        cancelled: true,
        lastStatusAt: new Date(event.occurredAt)
      }, session);
      return;
    }

    const shouldReverse = order.counted;
    order.cancelled = true;
    order.status = 'CANCELLED';
    order.lastStatusAt = new Date(event.occurredAt);
    order.counted = false;
    await order.save({session});

    if (shouldReverse) await updateSales(order, -1, session);
  }

  async function orderStatusChanged(event, session) {
    if (event.payload.status === 'CANCELLED') {
      await orderCancelled(event, session);
      return;
    }

    const {orderId, orderNumber, status} = event.payload;
    let order = await findOne(OrderProjection, {orderId}, session);
    if (!order) {
      order = await createOne(OrderProjection, {
        orderId,
        orderNumber,
        status,
        lastStatusAt: new Date(event.occurredAt)
      }, session);
      return;
    }

    const occurredAt = new Date(event.occurredAt);
    const isNewer = !order.lastStatusAt || occurredAt > order.lastStatusAt;
    const isEqualAndForward = order.lastStatusAt &&
      occurredAt.getTime() === order.lastStatusAt.getTime() &&
      (statusRank[status] || 0) >= (statusRank[order.status] || 0);
    if (
      !order.cancelled &&
      (isNewer || isEqualAndForward)
    ) {
      order.status = status;
      order.lastStatusAt = occurredAt;
      await order.save({session});
    }
  }

  return {
    userCreated,
    userUpdated,
    productChanged,
    ratingUpdated,
    orderConfirmed,
    orderCancelled,
    orderStatusChanged
  };
}
