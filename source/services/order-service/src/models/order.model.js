import mongoose from 'mongoose';

const {Schema} = mongoose;

const orderItemSchema = new Schema(
  {
    productId: {type: Schema.Types.ObjectId, required: true},
    variantId: {type: Schema.Types.ObjectId, required: true},
    sku: {type: String, required: true},
    productName: {type: String, required: true},
    variantName: {type: String, required: true},
    imageUrl: {type: String, required: true},
    brand: {type: String, required: true},
    categoryName: {type: String, required: true},
    quantity: {type: Number, required: true, min: 1},
    unitPrice: {type: Number, required: true, min: 0},
    unitCost: {type: Number, required: true, min: 0},
    lineTotal: {type: Number, required: true, min: 0}
  },
  {_id: false}
);

const shippingSchema = new Schema(
  {
    recipientName: {type: String, required: true},
    phone: {type: String, required: true},
    addressLine: {type: String, required: true},
    ward: {type: String, required: true},
    district: {type: String, required: true},
    province: {type: String, required: true}
  },
  {_id: false}
);

const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'SHIPPING',
        'DELIVERED',
        'CANCELLED'
      ],
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: null
    }
  },
  {_id: false}
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    checkoutId: {
      type: String,
      required: true,
      unique: true
    },
    cartId: {
      type: Schema.Types.ObjectId,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    guestToken: {
      type: String,
      default: null
    },
    customer: {
      fullName: {type: String, required: true},
      email: {type: String, required: true},
      phone: {type: String, required: true}
    },
    shippingAddress: {
      type: shippingSchema,
      required: true
    },
    items: {
      type: [orderItemSchema],
      required: true
    },
    pricing: {
      subtotal: {type: Number, required: true},
      discountAmount: {type: Number, required: true},
      shippingFee: {type: Number, required: true},
      total: {type: Number, required: true},
      totalCost: {type: Number, required: true},
      profit: {type: Number, required: true}
    },
    coupon: {
      type: {
        couponId: Schema.Types.ObjectId,
        code: String,
        discountType: String,
        discountValue: Number,
        discountAmount: Number,
        status: {
          type: String,
          enum: ['RESERVED', 'APPLIED', 'RELEASED']
        }
      },
      default: null
    },
    payment: {
      method: {
        type: String,
        enum: ['COD', 'SIMULATED_ONLINE'],
        required: true
      },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED'],
        required: true
      },
      transactionId: {
        type: String,
        default: null
      }
    },
    workflowStatus: {
      type: String,
      enum: [
        'AWAITING_INVENTORY',
        'CONFIRMED',
        'REJECTED'
      ],
      default: 'AWAITING_INVENTORY'
    },
    inventoryReservationId: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'SHIPPING',
        'DELIVERED',
        'CANCELLED'
      ],
      default: 'PENDING'
    },
    cancellationReason: {
      type: String,
      default: null
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

orderSchema.index({userId: 1, createdAt: -1});
orderSchema.index({status: 1, createdAt: -1});

export function getOrderModel(connection) {
  return connection.models.Order ||
    connection.model('Order', orderSchema, 'orders');
}