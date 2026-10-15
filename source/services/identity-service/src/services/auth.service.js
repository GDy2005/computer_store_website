import bcrypt from 'bcryptjs';
import {AppError} from '@store/validation';

import {
  enqueueEmailRequested,
  enqueueUserCreated,
  enqueueUserUpdated
} from '../events/user.events.js';

function invalidCredentials() {
  return new AppError(
    401,
    'INVALID_CREDENTIALS',
    'Invalid email or password'
  );
}

function actionUrl(path, token) {
  const base = process.env.FRONTEND_URL || 'http://localhost';

  const url = new URL(path, base);
  url.searchParams.set('token', token);

  return url.toString();
}

export function createAuthService({
  connection,
  User,
  Outbox,
  passwordTokenService
}) {
  async function register({
    input,
    correlationId
  }) {
    try {
      return await connection.transaction(async session => {
        const existing = await User.exists({
          email: input.email
        }).session(session);

        if (existing) {
          throw new AppError(
            409,
            'EMAIL_ALREADY_EXISTS',
            'Email already exists'
          );
        }

        const [user] = await User.create(
          [
            {
              email: input.email,
              fullName: input.fullName,
              role: 'CUSTOMER',
              accountStatus: 'PENDING_ACTIVATION',
              passwordHash: null,
              addresses: [
                {
                  ...input.address,
                  isDefault: true
                }
              ]
            }
          ],
          {session}
        );

        const token = await passwordTokenService.issue({
          userId: user._id,
          type: 'ACTIVATION',
          session
        });

        await enqueueUserCreated({
          Outbox,
          user,
          correlationId,
          session
        });

        await enqueueEmailRequested({
          Outbox,
          user,
          type: 'ACCOUNT_ACTIVATION',
          templateData: {
            fullName: user.fullName,
            actionUrl: actionUrl('/activate', token)
          },
          correlationId,
          session
        });

        return {
          userId: user._id.toString(),
          accountStatus: user.accountStatus
        };
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          409,
          'EMAIL_ALREADY_EXISTS',
          'Email already exists'
        );
      }

      throw error;
    }
  }

  async function activate({token, password}) {
    const passwordHash = await bcrypt.hash(password, 12);

    return connection.transaction(async session => {
      const passwordToken =
        await passwordTokenService.consume({
          rawToken: token,
          type: 'ACTIVATION',
          session
        });

      const user = await User.findOneAndUpdate(
        {
          _id: passwordToken.userId,
          accountStatus: 'PENDING_ACTIVATION'
        },
        {
          $set: {
            passwordHash,
            accountStatus: 'ACTIVE'
          }
        },
        {
          new: true,
          session
        }
      );

      if (!user) {
        throw new AppError(
          400,
          'TOKEN_INVALID_OR_EXPIRED',
          'Token is invalid or expired'
        );
      }

      return {
        userId: user._id.toString(),
        accountStatus: user.accountStatus
      };
    });
  }

  async function verifyCredentials({email, password}) {
    const user = await User.findOne({email})
      .select('+passwordHash');

    if (
      !user ||
      !user.passwordHash ||
      user.accountStatus !== 'ACTIVE' ||
      user.isBanned
    ) {
      throw invalidCredentials();
    }

    const valid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!valid) {
      throw invalidCredentials();
    }

    return {
      userId: user._id.toString(),
      role: user.role
    };
  }

  async function resolveGoogleUser({
    providerUserId,
    email,
    fullName,
    correlationId
  }) {
    return connection.transaction(async session => {
      let user = await User.findOne({
        socialAccounts: {
          $elemMatch: {
            provider: 'GOOGLE',
            providerUserId
          }
        }
      }).session(session);

      if (user) {
        if (user.isBanned || user.accountStatus !== 'ACTIVE') {
          throw new AppError(
            403,
            'ACCOUNT_DISABLED',
            'This account is not available'
          );
        }

        return {
          userId: user._id.toString(),
          role: user.role
        };
      }

      user = await User.findOne({email}).session(session);

      if (user) {
        if (user.isBanned) {
          throw new AppError(
            403,
            'ACCOUNT_DISABLED',
            'This account is not available'
          );
        }

        const linkedGoogle = user.socialAccounts.find(
          account => account.provider === 'GOOGLE'
        );

        if (linkedGoogle) {
          throw new AppError(
            409,
            'OAUTH_ACCOUNT_CONFLICT',
            'Email is already linked to another Google account'
          );
        }

        user.socialAccounts.push({
          provider: 'GOOGLE',
          providerUserId
        });
        user.accountStatus = 'ACTIVE';
        await user.save({session});

        await passwordTokenService.revokeAll({
          userId: user._id,
          type: 'ACTIVATION',
          session
        });

        await enqueueUserUpdated({
          Outbox,
          user,
          correlationId,
          session
        });
      } else {
        [user] = await User.create(
          [
            {
              email,
              fullName,
              role: 'CUSTOMER',
              accountStatus: 'ACTIVE',
              passwordHash: null,
              socialAccounts: [
                {
                  provider: 'GOOGLE',
                  providerUserId
                }
              ]
            }
          ],
          {session}
        );

        await enqueueUserCreated({
          Outbox,
          user,
          correlationId,
          session
        });
      }

      return {
        userId: user._id.toString(),
        role: user.role
      };
    });
  }

  async function forgotPassword({
    email,
    correlationId
  }) {
    const user = await User.findOne({
      email,
      accountStatus: 'ACTIVE',
      isBanned: false
    });

    if (!user) {
      return {accepted: true};
    }

    await connection.transaction(async session => {
      const token = await passwordTokenService.issue({
        userId: user._id,
        type: 'PASSWORD_RESET',
        session
      });

      await enqueueEmailRequested({
        Outbox,
        user,
        type: 'PASSWORD_RESET',
        templateData: {
          fullName: user.fullName,
          actionUrl: actionUrl('/reset-password', token)
        },
        correlationId,
        session
      });
    });

    return {accepted: true};
  }

  async function resetPassword({token, password}) {
    const passwordHash = await bcrypt.hash(password, 12);

    await connection.transaction(async session => {
      const passwordToken =
        await passwordTokenService.consume({
          rawToken: token,
          type: 'PASSWORD_RESET',
          session
        });

      const user = await User.findOneAndUpdate(
        {
          _id: passwordToken.userId,
          accountStatus: 'ACTIVE',
          isBanned: false
        },
        {
          $set: {
            passwordHash
          }
        },
        {session}
      );

      if (!user) {
        throw new AppError(
          400,
          'TOKEN_INVALID_OR_EXPIRED',
          'Token is invalid or expired'
        );
      }
    });

    return {changed: true};
  }

  return {
    register,
    activate,
    verifyCredentials,
    resolveGoogleUser,
    forgotPassword,
    resetPassword
  };
}
