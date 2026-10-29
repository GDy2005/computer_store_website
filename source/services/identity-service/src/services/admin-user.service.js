import {AppError} from '@store/validation';

import {
  enqueueUserUpdated
} from '../events/user.events.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function adminUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    isBanned: user.isBanned,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function createAdminUserService({
  connection,
  User,
  Outbox
}) {
  async function list({
    page,
    limit,
    search,
    isBanned,
    accountStatus
  }) {
    const filter = {};

    if (typeof isBanned === 'boolean') {
      filter.isBanned = isBanned;
    }

    if (accountStatus) {
      filter.accountStatus = accountStatus;
    }

    if (search) {
      const expression = new RegExp(
        escapeRegex(search),
        'i'
      );

      filter.$or = [
        {email: expression},
        {fullName: expression},
        {phone: expression}
      ];
    }

    const [users, totalItems] = await Promise.all([
      User.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return {
      items: users.map(adminUser),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(totalItems / limit)
        )
      }
    };
  }

  async function update({
    userId,
    input,
    correlationId
  }) {
    return connection.transaction(async session => {
      const user = await User.findById(userId)
        .session(session);

      if (!user) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'User not found'
        );
      }

      Object.assign(user, input);
      await user.save({session});

      await enqueueUserUpdated({
        Outbox,
        user,
        correlationId,
        session
      });

      return adminUser(user);
    });
  }

  async function setBan({
    userId,
    isBanned,
    correlationId
  }) {
    return connection.transaction(async session => {
      const user = await User.findById(userId)
        .session(session);

      if (!user) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'User not found'
        );
      }

      if (user.role === 'ADMIN') {
        throw new AppError(
          409,
          'ADMIN_ACCOUNT_PROTECTED',
          'Administrator account cannot be banned'
        );
      }

      if (user.isBanned === isBanned) {
        return adminUser(user);
      }

      user.isBanned = isBanned;
      await user.save({session});

      await enqueueUserUpdated({
        Outbox,
        user,
        correlationId,
        session
      });

      return adminUser(user);
    });
  }

  return {list, update, setBan};
}
