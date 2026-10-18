import {randomBytes} from 'node:crypto';
import {AppError} from '@store/validation';

import {
  enqueueOrderCreated
} from '../events/order.events.js';

function orderNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');

  const random = randomBytes(3)
    .toString('hex')
    .toUpperCase();

  return `ORD-${date}-${random}`;
}

function calculatePricing(cart, discountAmount) {
  const shippingFee =
    cart.subtotal >= 15000000 ? 0 : 50000;

  const total = Math.max(
    0,
    cart.subtotal - discountAmount + shippingFee
  );

  const totalCost = cart.items.reduce(
    (sum, item) =>
      sum + item.unitCost * item.quantity,
    0
  );

  return {
    subtotal: cart.subtotal,
    discountAmount,
    shippingFee,
    total,
    totalCost,
    profit:
      cart.subtotal -
      discountAmount -
      totalCost
  };
}

export function createCheckoutService({
  connection,
  Cart,
  Order,
  Outbox,
  cartService,
  couponService,
  identityClient
}) {
  async function preview({
    owner,
    couponCode,
    requestId
  }) {
    const cart = await cartService.get(
      owner,
      requestId
    );

    if (cart.items.length === 0) {
      throw new AppError(
        400,
        'EMPTY_CART',
        'Cart is empty'
      );
    }

    const coupon = await couponService.preview(
      couponCode,
      cart.subtotal
    );

    return {
      cart,
      coupon: coupon.coupon
        ? {code: coupon.coupon.code}
        : null,
      pricing: calculatePricing(
        cart,
        coupon.discountAmount
      )
    };
  }

  async function resolveCustomer(
    owner,
    input,
    requestId
  ) {
    if (owner.userId) {
      return identityClient.getUser(
        owner.userId,
        requestId
      );
    }

    return identityClient.resolveGuest(
      {
        email: input.customer.email,
        fullName: input.customer.fullName,
        phone: input.customer.phone,
        address: input.shippingAddress
      },
      requestId
    );
  }

  async function place({
    owner,
    input,
    requestId
  }) {
    function assertOwner(order) {
      const allowed = owner.userId
        ? order.userId === owner.userId
        : order.guestToken === owner.guestToken;
      if (!allowed) {
        throw new AppError(403, 'FORBIDDEN', 'Checkout does not belong to this user');
      }
      return order;
    }

    const previous = await Order.findOne({
      checkoutId: input.checkoutId
    });

    if (previous) {
      return assertOwner(previous);
    }

    const identity = await resolveCustomer(owner, input, requestId);

    const cart = await cartService.get(
      owner,
      requestId
    );

    if (!cart.cartId || cart.items.length === 0) {
      throw new AppError(
        400,
        'EMPTY_CART',
        'Cart is empty'
      );
    }

    try {
      return await connection.transaction(async session => {
        const existing = await Order.findOne({
          checkoutId: input.checkoutId
        }).session(session);

        if (existing) return assertOwner(existing);

        const reservedCoupon =
          await couponService.reserve(
            input.couponCode,
            cart.subtotal,
            session
          );

        const pricing = calculatePricing(
          cart,
          reservedCoupon.discountAmount
        );

        const coupon = reservedCoupon.coupon
          ? {
              couponId: reservedCoupon.coupon._id,
              code: reservedCoupon.coupon.code,
              discountType:
                reservedCoupon.coupon.discountType,
              discountValue:
                reservedCoupon.coupon.discountValue,
              discountAmount:
                reservedCoupon.discountAmount,
              status: 'RESERVED'
            }
          : null;

        const [order] = await Order.create(
          [{
            orderNumber: orderNumber(),
            checkoutId: input.checkoutId,
            cartId: cart.cartId,
            userId: identity.userId,
            guestToken: owner.guestToken,
            customer: {
              fullName:
                identity.fullName ||
                input.customer.fullName,
              email:
                identity.email ||
                input.customer.email,
              phone:
                input.customer.phone
            },
            shippingAddress:
              input.shippingAddress,
            items: cart.items,
            pricing,
            coupon,
            payment: {
              method: input.paymentMethod,
              status:
                input.paymentMethod ===
                'SIMULATED_ONLINE'
                  ? 'PAID'
                  : 'PENDING'
            },
            workflowStatus:
              'AWAITING_INVENTORY',
            status: 'PENDING',
            statusHistory: [{
              status: 'PENDING',
              note: 'Waiting for inventory'
            }]
          }],
          {session}
        );

        await enqueueOrderCreated({
          Outbox,
          order,
          correlationId: requestId,
          session
        });

        return order;
      });
    } catch (error) {
      // Concurrent retries may lose the unique checkoutId race after rollback.
      if (error.code !== 11000) throw error;
      const existing = await Order.findOne({checkoutId: input.checkoutId});
      if (!existing) throw error;
      return assertOwner(existing);
    }
  }

  async function status(orderNumberValue, owner) {
    const ownerQuery = owner.userId
      ? {userId: owner.userId}
      : {guestToken: owner.guestToken};

    const order = await Order.findOne({
      orderNumber: orderNumberValue,
      ...ownerQuery
    })
      .select(
        'orderNumber status workflowStatus cancellationReason createdAt'
      )
      .lean();

    if (!order) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Order not found'
      );
    }

    return order;
  }

  return {preview, place, status};
}
