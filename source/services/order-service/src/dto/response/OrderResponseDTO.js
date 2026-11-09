function identifier(value) {
  return value?.toString?.() || value;
}

function publicItem(item, includeCost = false) {
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
    ...(includeCost && {unitCost: item.unitCost}),
    lineTotal: item.lineTotal
  };
}

export class OrderResponseDTO {
  static customer(order, {detail = false} = {}) {
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
        pointsDiscount: order.pricing.pointsDiscount || 0,
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
      items: order.items.map(item => publicItem(item)),
      coupon: order.coupon
        ? {
            code: order.coupon.code,
            discountAmount: order.coupon.discountAmount,
            status: order.coupon.status
          }
        : null,
      loyalty: {
        pointsUsed: order.loyalty?.pointsUsed || 0,
        pointsEarned: order.loyalty?.pointsEarned || 0,
        redeemStatus: order.loyalty?.redeemStatus || 'NONE'
      },
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

  static admin(order, {detail = false} = {}) {
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
      items: order.items.map(item => publicItem(item, true)),
      loyalty: order.loyalty,
      loyaltyCredited: order.loyaltyCredited,
      inventoryReservationId: order.inventoryReservationId,
      cancellationReason: order.cancellationReason,
      statusHistory: [...order.statusHistory].sort(
        (left, right) =>
          new Date(right.updatedAt) - new Date(left.updatedAt)
      )
    };
  }
}
