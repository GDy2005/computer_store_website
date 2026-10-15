import mongoose from 'mongoose';

const {Schema} = mongoose;

const commentSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    userId: {
      type: String,
      default: null,
      index: true
    },
    guestName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 254,
      default: null,
      select: false
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

commentSchema.index({productId: 1, createdAt: -1});

export function getCommentModel(connection) {
  return (
    connection.models.Comment ||
    connection.model(
      'Comment',
      commentSchema,
      'comments'
    )
  );
}