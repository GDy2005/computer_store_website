import {AppError} from '@store/validation';

import {
  enqueueEmailRequested,
  enqueueUserCreated
} from '../events/user.events.js';

export function createInternalUserService({
  connection,
  User,
  Outbox,
  passwordTokenService
}) {
  function checkoutUser(user) {
    return {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      accountStatus: user.accountStatus
    };
  }

  async function getSummary(userId) {
    const user = await User.findOne({
      _id: userId,
      accountStatus: 'ACTIVE',
      isBanned: false
    })
      .select('fullName email phone role')
      .lean();

    if (!user) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'User not found'
      );
    }

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role
    };
  }

  async function resolveCheckout({
    input,
    correlationId
  }) {
    let user = await User.findOne({
      email: input.email
    });

    if (user) {
      if (user.isBanned) {
        throw new AppError(
          403,
          'ACCOUNT_DISABLED',
          'This account is disabled'
        );
      }

      return checkoutUser(user);
    }

    try {
      return await connection.transaction(async session => {
        [user] = await User.create(
          [{
            email: input.email,
            fullName: input.fullName,
            phone: input.phone,
            role: 'CUSTOMER',
            accountStatus: 'PENDING_ACTIVATION',
            passwordHash: null,
            addresses: [{
              ...input.address,
              label: 'Checkout',
              isDefault: true
            }]
          }],
          {session}
        );

        const token = await passwordTokenService.issue({
          userId: user._id,
          type: 'ACTIVATION',
          session
        });

        const actionUrl = new URL(
          '/activate',
          process.env.FRONTEND_URL ||
            'http://localhost'
        );

        actionUrl.searchParams.set('token', token);

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
            actionUrl: actionUrl.toString()
          },
          correlationId,
          session
        });

        return checkoutUser(user);
      });
    } catch (error) {
      if (error.code !== 11000) throw error;

      user = await User.findOne({email: input.email});

      if (!user || user.isBanned) throw error;

      return checkoutUser(user);
    }
  }

  return {
    getSummary,
    resolveCheckout
  };
}
