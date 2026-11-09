export function createLoyaltyRepository({
  LoyaltyAccount,
  LoyaltyTransaction
}) {
  return {
    findAccount(userId, session = null) {
      return LoyaltyAccount.findOne({userId})
        .session(session)
        .lean();
    },

    async listTransactions({userId, page, limit}) {
      const filter = {userId};
      const [items, totalItems] = await Promise.all([
        LoyaltyTransaction.find(filter)
          .sort({createdAt: -1})
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        LoyaltyTransaction.countDocuments(filter)
      ]);
      return {items, totalItems};
    },

    redeemPoints(userId, points, session) {
      return LoyaltyAccount.findOneAndUpdate(
        {userId, pointsBalance: {$gte: points}},
        {$inc: {pointsBalance: -points, version: 1}},
        {new: true, session}
      );
    },

    addPoints(userId, points, session) {
      return LoyaltyAccount.findOneAndUpdate(
        {userId},
        {$inc: {pointsBalance: points, version: 1}},
        {
          new: true,
          upsert: true,
          session,
          setDefaultsOnInsert: true
        }
      );
    },

    updateTransaction(filter, changes, session) {
      return LoyaltyTransaction.findOneAndUpdate(
        filter,
        {$set: changes},
        {new: true, session}
      );
    },

    async createTransaction(input, session) {
      const [transaction] = await LoyaltyTransaction.create(
        [input],
        {session}
      );
      return transaction;
    }
  };
}
