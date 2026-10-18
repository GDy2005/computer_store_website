import mongoose from 'mongoose';

const {Schema} = mongoose;

const loyaltyTransactionSchema = new Schema(
  {
    userId: {type: String, required: true},
    orderId: {type: Schema.Types.ObjectId, required: true},
    type: {
      type: String,
      enum: ['EARN', 'REDEEM', 'REFUND'],
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMMITTED', 'REVERSED'],
      required: true
    },
    points: {type: Number, required: true, min: 1},
    balanceAfter: {type: Number, required: true, min: 0},
    description: {type: String, required: true, maxlength: 255}
  },
  {timestamps: true, versionKey: false}
);

loyaltyTransactionSchema.index({userId: 1, createdAt: -1});
loyaltyTransactionSchema.index(
  {orderId: 1, type: 1},
  {unique: true}
);

export function getLoyaltyTransactionModel(connection) {
  return connection.models.LoyaltyTransaction || connection.model(
    'LoyaltyTransaction',
    loyaltyTransactionSchema,
    'loyalty_transactions'
  );
}
