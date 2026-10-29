import {AppError} from '@store/validation';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function identifier(value) {
  return value?.toString?.() || value;
}

function orderItem(item) {
  return {
    productId: identifier(item.productId),
    variantId: identifier(item.variantId),
    sku: item.sku,
    productName: item.productName,
    variantName: item.variantName,
    imageUrl: item.imageUrl,
    brand: item.brand,
    categoryName: item.categoryName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
    lineTotal: item.lineTotal
  };
}

function adminOrder(order, {detail = false} = {}) {
  const result = {
    id: identifier(order._id),
    orderNumber: order.orderNumber,
    userId: identifier(order.userId),
    customer: order.customer,
    itemCount: order.items.reduce(
      (total, item) => total + item.quantity,
      0
    ),
    pricing: order.pricing,
    payment: order.payment,
    coupon: order.coupon
      ? {
          code: order.coupon.code,
          discountAmount: order.coupon.discountAmount,
          status: order.coupon.status
        }
      : null,
    status: order.status,
    workflowStatus: order.workflowStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };

  if (!detail) return result;

  return {
    ...result,
    shippingAddress: order.shippingAddress,
    items: order.items.map(orderItem),
    loyalty: order.loyalty,
    loyaltyCredited: order.loyaltyCredited,
    inventoryReservationId:
      order.inventoryReservationId,
    cancellationReason: order.cancellationReason,
    statusHistory: [...order.statusHistory]
      .sort((left, right) =>
        new Date(right.updatedAt) -
        new Date(left.updatedAt)
      )
  };
}

export function createAdminOrderService({Order}) {
  async function list({
    page,
    limit,
    search,
    status,
    startDate,
    endDate
  }) {
    const filter = {};

    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    if (search) {
      const expression = new RegExp(
        escapeRegex(search),
        'i'
      );

      filter.$or = [
        {orderNumber: expression},
        {'customer.fullName': expression},
        {'customer.email': expression},
        {'customer.phone': expression}
      ];
    }

    const [orders, totalItems] = await Promise.all([
      Order.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return {
      items: orders.map(order => adminOrder(order)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / limit)
        )
      }
    };
  }

  async function detail(orderId) {
    const order = await Order.findById(orderId).lean();

    if (!order) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Order not found'
      );
    }

    return adminOrder(order, {detail: true});
  }

  return {list, detail};
}
