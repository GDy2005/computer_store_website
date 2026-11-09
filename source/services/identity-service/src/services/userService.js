import bcrypt from 'bcryptjs';
import {AppError} from '@store/validation';

import {
  enqueueUserUpdated
} from '../events/user.events.js';
import {createUserRepository} from '../repositories/userRepository.js';

export function createUserService({
  connection,
  userRepository: injectedUserRepository,
  User,
  Outbox,
  passwordTokenService,
  avatarStorageService
}) {
  const userRepository = injectedUserRepository ||
    createUserRepository({User});
  async function getMe(userId) {
    const user = await userRepository.findAvailableById(
      userId,
      {lean: true}
    );

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
      const user = await userRepository.findAvailableById(
        userId,
        {session}
      );

      if (!user) {
        throw new AppError(
          404,
          'NOT_FOUND',
          'User not found'
        );
      }

      Object.assign(user, input);
      await userRepository.save(user, {session});

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
    const user = await userRepository.findAvailableById(
      userId,
      {select: '+passwordHash'}
    );

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
      await userRepository.updateActivePassword(
        userId,
        passwordHash,
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

  async function updateAvatar({
    userId,
    file,
    correlationId
  }) {
    const uploaded = await avatarStorageService.upload(file, userId);
    let previousPublicId = null;

    try {
      const result = await connection.transaction(async session => {
        const user = await userRepository.findAvailableById(
          userId,
          {session, select: '+avatarPublicId'}
        );

        if (!user) {
          throw new AppError(404, 'NOT_FOUND', 'User not found');
        }

        previousPublicId = user.avatarPublicId;
        user.avatarUrl = uploaded.url;
        user.avatarPublicId = uploaded.publicId;
        await userRepository.save(user, {session});

        await enqueueUserUpdated({
          Outbox,
          user,
          correlationId,
          session
        });

        return user.toJSON();
      });

      if (previousPublicId) {
        avatarStorageService.remove(previousPublicId).catch(() => {});
      }

      return result;
    } catch (error) {
      await avatarStorageService.remove(uploaded.publicId).catch(() => {});
      throw error;
    }
  }

  return {
    getMe,
    updateMe,
    changePassword,
    updateAvatar
  };
}
