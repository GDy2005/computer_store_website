import bcrypt from 'bcryptjs';
import {AppError} from '@store/validation';

import {
  enqueueUserUpdated
} from '../events/user.events.js';

export function createUserService({
  connection,
  User,
  Outbox,
  passwordTokenService
}) {
  async function getMe(userId) {
    const user = await User.findOne({
      _id: userId,
      accountStatus: 'ACTIVE',
      isBanned: false
    }).lean();

    if (!user) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'User not found'
      );
    }

    return user;
  }

  async function updateMe({
    userId,
    input,
    correlationId
  }) {
    return connection.transaction(async session => {
      const user = await User.findOne({
        _id: userId,
        accountStatus: 'ACTIVE',
        isBanned: false
      }).session(session);

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

      return user.toJSON();
    });
  }

  async function changePassword({
    userId,
    currentPassword,
    newPassword
  }) {
    const user = await User.findOne({
      _id: userId,
      accountStatus: 'ACTIVE',
      isBanned: false
    })
      .select('+passwordHash');

    if (!user?.passwordHash) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Current password is incorrect'
      );
    }

    const currentValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!currentValid) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Current password is incorrect'
      );
    }

    const unchanged = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (unchanged) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'New password must be different'
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await connection.transaction(async session => {
      await User.updateOne(
        {
          _id: userId,
          accountStatus: 'ACTIVE',
          isBanned: false
        },
        {$set: {passwordHash}},
        {session}
      );

      await passwordTokenService.revokeAll({
        userId,
        type: 'PASSWORD_RESET',
        session
      });
    });

    return {changed: true};
  }

  return {
    getMe,
    updateMe,
    changePassword
  };
}
