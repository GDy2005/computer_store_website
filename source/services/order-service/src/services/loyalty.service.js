import {AppError} from '@store/validation';

export function createLoyaltyService({
  LoyaltyAccount,
  LoyaltyTransaction
}) {
  async function balance(userId, session = null) {
    const account = await LoyaltyAccount.findOne({userId})
      .session(session)
      .lean();
    return account?.pointsBalance || 0;
  }

  async function summary(userId, {page, limit}) {
    const filter = {userId};
    const [pointsBalance, transactions, totalItems] = await Promise.all([
      balance(userId),
      LoyaltyTransaction.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LoyaltyTransaction.countDocuments(filter)
    ]);

    return {
      pointsBalance,
      transactions: transactions.map(transaction => ({
        id: transaction._id.toString(),
        orderId: transaction.orderId.toString(),
        type: transaction.type,
        status: transaction.status,
        points: transaction.points,
        balanceAfter: transaction.balanceAfter,
        description: transaction.description,
        createdAt: transaction.createdAt
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit))
      }
    };
  }

  async function preview(userId, points, maximumPoints) {
    if (!points) {
      return {pointsUsed: 0, pointsDiscount: 0};
    }
    if (!userId) {
      throw new AppError(
        401, 'LOYALTY_LOGIN_REQUIRED', 'Sign in to redeem loyalty points'
      );
    }
    if (points > maximumPoints) {
      throw new AppError(
        400,
        'LOYALTY_EXCEEDS_ORDER',
        `This order can use at most ${maximumPoints} points`
      );
    }
    const pointsBalance = await balance(userId);
    if (points > pointsBalance) {
      throw new AppError(
        400, 'LOYALTY_INSUFFICIENT', 'Insufficient loyalty points'
      );
    }
    return {pointsUsed: points, pointsDiscount: points * 1000};
  }

  async function reserve({
    userId, order, points, maximumPoints, session
  }) {
    if (!points) return null;
    if (!userId || points > maximumPoints) {
      throw new AppError(
        400, 'LOYALTY_INVALID_REDEMPTION', 'Invalid loyalty redemption'
      );
    }

    const account = await LoyaltyAccount.findOneAndUpdate(
      {userId, pointsBalance: {$gte: points}},
      {$inc: {pointsBalance: -points, version: 1}},
      {new: true, session}
    );
    if (!account) {
      throw new AppError(
        409,
        'LOYALTY_BALANCE_CHANGED',
        'Loyalty balance changed; review the order and try again'
      );
    }

    const [transaction] = await LoyaltyTransaction.create([{
      userId,
      orderId: order._id,
      type: 'REDEEM',
      status: 'PENDING',
      points,
      balanceAfter: account.pointsBalance,
      description: `Redeemed for order ${order.orderNumber}`
    }], {session});
    return transaction;
  }

  async function commitRedemption(order, session) {
    if (!order.loyalty?.pointsUsed || order.loyalty.redeemStatus !== 'PENDING') {
      return null;
    }
    const redemption = await LoyaltyTransaction.findOneAndUpdate(
      {orderId: order._id, type: 'REDEEM', status: 'PENDING'},
      {$set: {status: 'COMMITTED'}},
      {new: true, session}
    );
    if (!redemption) return null;
    order.loyalty.redeemStatus = 'COMMITTED';
    return redemption;
  }

  async function refundRedemption(order, session) {
    const redeemStatus = order.loyalty?.redeemStatus;
    if (
      !order.loyalty?.pointsUsed ||
      !['PENDING', 'COMMITTED'].includes(redeemStatus)
    ) {
      return null;
    }
    const redemption = await LoyaltyTransaction.findOneAndUpdate(
      {orderId: order._id, type: 'REDEEM', status: redeemStatus},
      {$set: {status: 'REVERSED'}},
      {new: true, session}
    );
    if (!redemption) return null;

    const account = await LoyaltyAccount.findOneAndUpdate(
      {userId: order.userId},
      {
        $inc: {
          pointsBalance: order.loyalty.pointsUsed,
          version: 1
        }
      },
      {new: true, upsert: true, session, setDefaultsOnInsert: true}
    );
    const [refund] = await LoyaltyTransaction.create([{
      userId: order.userId,
      orderId: order._id,
      type: 'REFUND',
      status: 'COMMITTED',
      points: order.loyalty.pointsUsed,
      balanceAfter: account.pointsBalance,
      description: `Refunded from order ${order.orderNumber}`
    }], {session});
    order.loyalty.redeemStatus = 'REFUNDED';
    return refund;
  }

  async function earn(order, session) {
    if (order.loyaltyCredited) return null;

    const points = Math.floor(order.pricing.total * 0.1 / 1000);
    if (!order.loyalty) {
      order.loyalty = {
        pointsUsed: 0,
        pointsEarned: 0,
        redeemStatus: 'NONE'
      };
    }
    order.loyaltyCredited = true;
    order.loyalty.pointsEarned = points;
    if (points === 0) return null;

    const account = await LoyaltyAccount.findOneAndUpdate(
      {userId: order.userId},
      {$inc: {pointsBalance: points, version: 1}},
      {new: true, upsert: true, session, setDefaultsOnInsert: true}
    );
    const [transaction] = await LoyaltyTransaction.create([{
      userId: order.userId,
      orderId: order._id,
      type: 'EARN',
      status: 'COMMITTED',
      points,
      balanceAfter: account.pointsBalance,
      description: `Earned from order ${order.orderNumber}`
    }], {session});
    return transaction;
  }

  return {
    balance,
    summary,
    preview,
    reserve,
    commitRedemption,
    refundRedemption,
    earn
  };
}
