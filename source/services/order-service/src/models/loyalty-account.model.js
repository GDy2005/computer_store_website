import mongoose from 'mongoose';

const {Schema} = mongoose;

const loyaltyAccountSchema = new Schema(
  {
    userId: {type: String, required: true, unique: true},
    pointsBalance: {type: Number, required: true, min: 0, default: 0},
    version: {type: Number, required: true, min: 0, default: 0}
  },
  {timestamps: true, versionKey: false}
);

export function getLoyaltyAccountModel(connection) {
  return connection.models.LoyaltyAccount || connection.model(
    'LoyaltyAccount', loyaltyAccountSchema, 'loyalty_accounts'
  );
}
