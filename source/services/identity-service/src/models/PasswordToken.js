import mongoose from 'mongoose';

const {Schema} = mongoose;

const passwordTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['ACTIVATION', 'PASSWORD_RESET'],
      required: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    usedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

passwordTokenSchema.index(
  {expiresAt: 1},
  {expireAfterSeconds: 0}
);

passwordTokenSchema.index({
  userId: 1,
  type: 1,
  usedAt: 1
});

export function getPasswordTokenModel(connection) {
  return (
    connection.models.PasswordToken ||
    connection.model(
      'PasswordToken',
      passwordTokenSchema,
      'password_tokens'
    )
  );
}