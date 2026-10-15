import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import {
  getUserModel
} from '../models/user.model.js';

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
  await User.init();

  const existing = await User.findOne({email});

  if (existing && existing.role !== 'ADMIN') {
    throw new Error(
      'ADMIN_EMAIL belongs to a non-admin account'
    );
  }

  if (!existing) {
    await User.create({
      email,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: 'System Administrator',
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      isBanned: false
    });

    console.log('Admin created');
  } else {
    console.log('Admin already exists');
  }
} finally {
  await connection.close();
}
