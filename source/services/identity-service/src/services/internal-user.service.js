import {AppError} from '@store/validation';

export function createInternalUserService({User}) {
  return {
    async getSummary(userId) {
      const user = await User.findOne({
        _id: userId,
        accountStatus: 'ACTIVE',
        isBanned: false
      })
        .select('fullName role')
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
        role: user.role
      };
    }
  };
}