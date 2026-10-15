import {AppError} from '@store/validation';

export function createAddressService({User}) {
  async function findUser(userId) {
    const user = await User.findOne({
      _id: userId,
      accountStatus: 'ACTIVE',
      isBanned: false
    });

    if (!user) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'User not found'
      );
    }

    return user;
  }

  async function list(userId) {
    const user = await findUser(userId);

    return user.addresses;
  }

  async function create(userId, input) {
    const user = await findUser(userId);

    user.addresses.push({
      ...input,
      isDefault: user.addresses.length === 0
    });

    await user.save();

    return user.addresses.at(-1);
  }

  async function update(userId, addressId, input) {
    const user = await findUser(userId);
    const address = user.addresses.id(addressId);

    if (!address) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Address not found'
      );
    }

    Object.assign(address, input);
    await user.save();

    return address;
  }

  async function remove(userId, addressId) {
    const user = await findUser(userId);
    const address = user.addresses.id(addressId);

    if (!address) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Address not found'
      );
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return {deleted: true};
  }

  async function setDefault(userId, addressId) {
    const user = await findUser(userId);
    const address = user.addresses.id(addressId);

    if (!address) {
      throw new AppError(
        404,
        'NOT_FOUND',
        'Address not found'
      );
    }

    for (const item of user.addresses) {
      item.isDefault =
        item._id.toString() === addressId;
    }

    await user.save();

    return address;
  }

  return {
    list,
    create,
    update,
    remove,
    setDefault
  };
}