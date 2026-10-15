import mongoose from 'mongoose';

const {Schema} = mongoose;

const addressSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'Home'
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    ward: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    district: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    province: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {timestamps: true}
);

const socialAccountSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ['GOOGLE'],
      required: true
    },
    providerUserId: {
      type: String,
      required: true
    }
  },
  {_id: false}
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: null,
      select: false
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: null
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN'],
      default: 'CUSTOMER'
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'PENDING_ACTIVATION'],
      default: 'PENDING_ACTIVATION'
    },
    socialAccounts: {
      type: [socialAccountSchema],
      default: []
    },
    addresses: {
      type: [addressSchema],
      default: [],
      validate: {
        validator(addresses) {
          return addresses.filter(item => item.isDefault).length <= 1;
        },
        message: 'Only one default address is allowed'
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(document, result) {
        delete result.passwordHash;
        return result;
      }
    }
  }
);

userSchema.index({email: 1}, {unique: true});

userSchema.index(
  {
    'socialAccounts.provider': 1,
    'socialAccounts.providerUserId': 1
  },
  {
    unique: true,
    sparse: true
  }
);

export function getUserModel(connection) {
  return (
    connection.models.User ||
    connection.model('User', userSchema, 'users')
  );
}