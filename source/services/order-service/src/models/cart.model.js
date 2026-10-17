import mongoose from 'mongoose';

const {Schema} = mongoose;

const cartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    variantId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      validate: Number.isInteger
    }
  },
  {_id: false}
);

const cartSchema = new Schema(
  {
    userId: {
      type: String,
      default: null
    },
    guestToken: {
      type: String,
      default: null
    },
    items: {
      type: [cartItemSchema],
      default: []
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

cartSchema.pre('validate', function validateOwner() {
  const ownerCount =
    Number(Boolean(this.userId)) +
    Number(Boolean(this.guestToken));

  if (ownerCount !== 1) {
    this.invalidate(
      'userId',
      'Cart must belong to exactly one user or guest'
    );
  }

  const variantIds = this.items.map(item =>
    item.variantId.toString()
  );

  if (new Set(variantIds).size !== variantIds.length) {
    this.invalidate(
      'items',
      'A variant can appear only once in a cart'
    );
  }
});

cartSchema.index(
  {userId: 1},
  {
    unique: true,
    partialFilterExpression: {
      userId: {$type: 'string'}
    }
  }
);

cartSchema.index(
  {guestToken: 1},
  {
    unique: true,
    partialFilterExpression: {
      guestToken: {$type: 'string'}
    }
  }
);

cartSchema.index(
  {expiresAt: 1},
  {expireAfterSeconds: 0}
);

export function getCartModel(connection) {
  return connection.models.Cart ||
    connection.model('Cart', cartSchema, 'carts');
}