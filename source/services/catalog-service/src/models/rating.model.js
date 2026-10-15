import mongoose from 'mongoose';

const {Schema} = mongoose;

const ratingSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: Number.isInteger
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

ratingSchema.index(
  {productId: 1, userId: 1},
  {unique: true}
);

ratingSchema.index({productId: 1, stars: 1});

export function getRatingModel(connection) {
  return (
    connection.models.Rating ||
    connection.model(
      'Rating',
      ratingSchema,
      'ratings'
    )
  );
}