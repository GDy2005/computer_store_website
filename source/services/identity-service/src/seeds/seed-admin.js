import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {VIETNAM_DEMO_ADDRESSES} from '@store/validation';

import {
  getUserModel
} from '../models/User.js';

import {
  enqueueUserCreated
} from '../events/user.events.js';

const adminEmail = process.env.ADMIN_EMAIL
  ?.trim()
  .toLowerCase();

const adminPassword =
  process.env.ADMIN_INITIAL_PASSWORD;

const demoCustomerId = process.env.DEMO_CUSTOMER_ID ||
  '64b000000000000000000001';
const demoCustomerEmail = (
  process.env.DEMO_CUSTOMER_EMAIL || 'customer@example.com'
).trim().toLowerCase();
const demoCustomerPassword = process.env.DEMO_CUSTOMER_PASSWORD ||
  'Customer@123';

function demoCustomerAddresses() {
  return [
    {
      _id: new mongoose.Types.ObjectId(
        '64b000000000000000000011'
      ),
      label: 'HOME',
      recipientName: 'Demo Customer',
      phone: '0901234567',
      ...VIETNAM_DEMO_ADDRESSES.CHO_QUAN,
      isDefault: true
    },
    {
      _id: new mongoose.Types.ObjectId(
        '64b000000000000000000012'
      ),
      label: 'OFFICE',
      recipientName: 'Demo Customer',
      phone: '0901234567',
      ...VIETNAM_DEMO_ADDRESSES.TAN_HUNG,
      isDefault: false
    }
  ];
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

if (!adminEmail || !adminPassword) {
  throw new Error(
    'ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD are required'
  );
}

for (const [name, value] of [
  ['ADMIN_INITIAL_PASSWORD', adminPassword],
  ['DEMO_CUSTOMER_PASSWORD', demoCustomerPassword]
]) {
  if (value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new Error(
      `${name} must contain at least 8 characters and at most 72 bytes`
    );
  }
}

if (!mongoose.isObjectIdOrHexString(demoCustomerId)) {
  throw new Error('DEMO_CUSTOMER_ID must be a valid MongoDB ObjectId');
}

const connection = await mongoose
  .createConnection(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'identity_db'
  })
  .asPromise();

try {
  const User = getUserModel(connection);
  const SeedOutbox = connection.model(
    'SeedOutbox',
    new mongoose.Schema(
      {
        eventId: {type: String, required: true, unique: true},
        topic: {type: String, required: true},
        key: {type: String, required: true},
        payload: {type: mongoose.Schema.Types.Mixed, required: true},
        status: {type: String, default: 'PENDING'},
        attempts: {type: Number, default: 0},
        nextAttemptAt: {type: Date, default: Date.now},
        createdAt: {type: Date, default: Date.now}
      },
      {versionKey: false}
    ),
    'outbox_events'
  );

  await Promise.all([User.init(), SeedOutbox.init()]);

  let adminCreated = false;
  let customerCreated = false;

  await connection.transaction(async session => {
    let admin = await User.findOne({email: adminEmail}).session(session);

    if (admin && admin.role !== 'ADMIN') {
      throw new Error(
        'ADMIN_EMAIL belongs to a non-admin account'
      );
    }

    if (!admin) {
      [admin] = await User.create(
        [
          {
            email: adminEmail,
            passwordHash: await bcrypt.hash(adminPassword, 12),
            fullName: 'System Administrator',
            role: 'ADMIN',
            accountStatus: 'ACTIVE',
            isBanned: false
          }
        ],
        {session}
      );
      adminCreated = true;
    }

    const eventExists = await SeedOutbox.exists({
      topic: 'users.created.v1',
      'payload.payload.userId': admin._id.toString()
    }).session(session);

    if (!eventExists) {
      await enqueueUserCreated({
        Outbox: SeedOutbox,
        user: admin,
        correlationId: 'identity-admin-seed',
        session
      });
    }

    const customerObjectId = new mongoose.Types.ObjectId(demoCustomerId);
    let customer = await User.findOne({
      $or: [
        {_id: customerObjectId},
        {email: demoCustomerEmail}
      ]
    }).select('+passwordHash').session(session);

    if (customer && customer.role !== 'CUSTOMER') {
      throw new Error(
        'DEMO_CUSTOMER_EMAIL belongs to a non-customer account'
      );
    }
    if (customer && customer._id.toString() !== demoCustomerId) {
      throw new Error(
        'DEMO_CUSTOMER_EMAIL already exists with a different id'
      );
    }

    if (!customer) {
      [customer] = await User.create(
        [
          {
            _id: customerObjectId,
            email: demoCustomerEmail,
            passwordHash: await bcrypt.hash(demoCustomerPassword, 12),
            fullName: 'Demo Customer',
            phone: '0901234567',
            role: 'CUSTOMER',
            accountStatus: 'ACTIVE',
            isBanned: false,
            addresses: demoCustomerAddresses()
          }
        ],
        {session}
      );
      customerCreated = true;
    } else {
      if (!customer.passwordHash) {
        customer.passwordHash = await bcrypt.hash(demoCustomerPassword, 12);
      }
      customer.fullName = 'Demo Customer';
      customer.phone = '0901234567';
      customer.accountStatus = 'ACTIVE';
      customer.isBanned = false;
      customer.addresses = demoCustomerAddresses();
      await customer.save({session});
    }

    const customerEventExists = await SeedOutbox.exists({
      topic: 'users.created.v1',
      'payload.payload.userId': customer._id.toString()
    }).session(session);

    if (!customerEventExists) {
      await enqueueUserCreated({
        Outbox: SeedOutbox,
        user: customer,
        correlationId: 'identity-demo-customer-seed',
        session
      });
    }
  });

  console.log(adminCreated ? 'Admin created' : 'Admin already exists');
  console.log(
    customerCreated
      ? 'Demo customer created'
      : 'Demo customer already exists'
  );
} finally {
  await connection.close();
}
