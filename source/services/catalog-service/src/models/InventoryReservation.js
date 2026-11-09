import mongoose from 'mongoose';

const {Schema} = mongoose;

const itemSchema = new Schema(
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
      validate: Number.isInteger
    }
  },
  {_id: false}
);

const inventoryReservationSchema = new Schema(
  {
    reservationId: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    orderNumber: {
      type: String,
      required: true
    },
    items: {
      type: [itemSchema],
      default: []
    },
    status: {
      type: String,
      enum: [
        'RESERVED',
        'RELEASED',
        'COMMITTED',
        'REJECTED'
      ],
      required: true
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

inventoryReservationSchema.index(
  {reservationId: 1},
  {unique: true}
);

inventoryReservationSchema.index(
  {orderId: 1},
  {unique: true}
);

export function getInventoryReservationModel(connection) {
  return (
    connection.models.InventoryReservation ||
    connection.model(
      'InventoryReservation',
      inventoryReservationSchema,
      'inventory_reservations'
    )
  );
}