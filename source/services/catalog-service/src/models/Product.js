import mongoose from 'mongoose';

const {Schema} = mongoose;

const imageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      match: /^https:\/\//
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    alt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    }
  },
  {_id: false}
);

const variantSchema = new Schema({
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 100
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  attributes: {
    type: Map,
    of: String,
    default: {}
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    validate: Number.isInteger
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
    validate: Number.isInteger
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    validate: Number.isInteger
  },
  reservedStock: {
    type: Number,
    min: 0,
    default: 0,
    validate: {
      validator(value) {
        return (
          Number.isInteger(value) &&
          value <= this.stock
        );
      },
      message: 'Reserved stock cannot exceed stock'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return images.length >= 3 && images.length <= 10;
        },
        message: 'Product requires between 3 and 10 images'
      }
    },
    variants: {
      type: [variantSchema],
      validate: {
        validator(variants) {
          if (variants.length < 2 || variants.length > 30) {
            return false;
          }

          const skus = variants.map(item => item.sku);
          return new Set(skus).size === skus.length;
        },
        message: 'Product requires between 2 and 30 unique variants'
      }
    },
    minPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    maxPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingCount: {
      type: Number,
      min: 0,
      default: 0
    },
    soldCount: {
      type: Number,
      min: 0,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

productSchema.pre('validate', function calculatePriceRange() {
  const activeVariants = this.variants.filter(
    variant => variant.isActive
  );

  if (activeVariants.length === 0) {
    this.invalidate(
      'variants',
      'At least one variant must be active'
    );
    return;
  }

  this.minPrice = Math.min(
    ...activeVariants.map(variant => variant.price)
  );

  this.maxPrice = Math.max(
    ...activeVariants.map(variant => variant.price)
  );
});

productSchema.index({slug: 1}, {unique: true});
productSchema.index({'variants.sku': 1}, {unique: true});
productSchema.index({categoryId: 1, isActive: 1});
productSchema.index({brand: 1, minPrice: 1});
productSchema.index({averageRating: -1});
productSchema.index({createdAt: -1});
productSchema.index({
  name: 'text',
  brand: 'text',
  tags: 'text',
  shortDescription: 'text'
});

export function getProductModel(connection) {
  return (
    connection.models.Product ||
    connection.model(
      'Product',
      productSchema,
      'products'
    )
  );
}