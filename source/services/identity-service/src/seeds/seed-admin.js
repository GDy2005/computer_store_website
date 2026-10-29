import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import {
  getUserModel
} from '../models/user.model.js';

import {
  enqueueUserCreated
} from '../events/user.events.js';

const email = process.env.ADMIN_EMAIL
  ?.trim()
  .toLowerCase();

const password =
  process.env.ADMIN_INITIAL_PASSWORD;

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

if (!email || !password) {
  throw new Error(
    'ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD are required'
  );
}

if (
  password.length < 8 ||
  Buffer.byteLength(password, 'utf8') > 72
) {
  throw new Error(
    'ADMIN_INITIAL_PASSWORD must contain at least 8 characters and at most 72 bytes'
  );
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

  let created = false;

  await connection.transaction(async session => {
    let admin = await User.findOne({email}).session(session);

    if (admin && admin.role !== 'ADMIN') {
      throw new Error(
        'ADMIN_EMAIL belongs to a non-admin account'
      );
    }

    if (!admin) {
      [admin] = await User.create(
        [
          {
            email,
            passwordHash: await bcrypt.hash(password, 12),
            fullName: 'System Administrator',
            role: 'ADMIN',
            accountStatus: 'ACTIVE',
            isBanned: false
          }
        ],
        {session}
      );
      created = true;
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
  });

  console.log(created ? 'Admin created' : 'Admin already exists');
} finally {
  await connection.close();
}
