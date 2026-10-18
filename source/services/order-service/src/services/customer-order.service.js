import {AppError} from '@store/validation';

function publicItem(item) {
  return {
    productId: item.productId?.toString?.() || item.productId,
    variantId: item.variantId?.toString?.() || item.variantId,
    sku: item.sku,
    productName: item.productName,
    variantName: item.variantName,
    imageUrl: item.imageUrl,
    brand: item.brand,
    categoryName: item.categoryName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal
  };
}

function publicOrder(order, detail = false) {
  const result = {
    orderNumber: order.orderNumber,
    status: order.status,
    workflowStatus: order.workflowStatus,
    itemCount: order.items.reduce(
      (total, item) => total + item.quantity,
      0
    ),
    pricing: {
      subtotal: order.pricing.subtotal,
      discountAmount: order.pricing.discountAmount,
      shippingFee: order.pricing.shippingFee,
      total: order.pricing.total
    },
    payment: {
      method: order.payment.method,
      status: order.payment.status
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };

  if (!detail) return result;

  return {
    ...result,
    customer: order.customer,
    shippingAddress: order.shippingAddress,
    items: order.items.map(publicItem),
    coupon: order.coupon
      ? {
          code: order.coupon.code,
          discountAmount: order.coupon.discountAmount,
          status: order.coupon.status
        }
      : null,
    cancellationReason: order.cancellationReason,
    statusHistory: [...order.statusHistory]
      .sort((left, right) =>
        new Date(right.updatedAt) - new Date(left.updatedAt)
      )
      .map(entry => ({
        status: entry.status,
        updatedAt: entry.updatedAt,
        note: entry.note
      }))
  };
}

export function createCustomerOrderService({Order}) {
  async function list(userId, {page, limit}) {
    const filter = {userId};
    const [orders, totalItems] = await Promise.all([
      Order.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);

    return {
      items: orders.map(order => publicOrder(order)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit))
      }
    };
  }

  async function detail(userId, orderNumber) {
    const order = await Order.findOne({userId, orderNumber}).lean();

    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    return publicOrder(order, true);
  }

  return {list, detail};
}
