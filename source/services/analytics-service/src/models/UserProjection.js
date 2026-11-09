import mongoose from 'mongoose';

const {Schema} = mongoose;

const userProjectionSchema = new Schema(
  {
    userId: {type: String, required: true, unique: true},
    role: {type: String, default: null},
    isBanned: {type: Boolean, default: false},
    createdDate: {type: String, default: null},
    counted: {type: Boolean, default: false}
  },
  {timestamps: true, versionKey: false}
);

export function getUserProjectionModel(connection) {
  return connection.models.UserProjection || connection.model(
    'UserProjection',
    userProjectionSchema,
    'user_projections'
  );
}
