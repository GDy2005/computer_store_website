function plain(value) {
  return typeof value?.toObject === 'function'
    ? value.toObject({flattenMaps: true})
    : value;
}

export function toAddressResponseDTO(value) {
  const address = plain(value);

  return {
    id: String(address._id || address.id),
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine: address.addressLine,
    ward: address.ward,
    district: address.district,
    province: address.province,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt
  };
}

export function toUserResponseDTO(value) {
  const user = plain(value);

  return {
    id: String(user._id || user.id),
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl || 'https://res.cloudinary.com/ipc-media/image/upload/v1794128471/hcibhstn0zhnhzfxyipw.webp',
    role: user.role,
    accountStatus: user.accountStatus,
    addresses: (user.addresses || []).map(toAddressResponseDTO),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function toAdminUserResponseDTO(value) {
  const user = plain(value);

  return {
    id: String(user._id || user.id),
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl || 'https://res.cloudinary.com/ipc-media/image/upload/v1794128471/hcibhstn0zhnhzfxyipw.webp',
    role: user.role,
    isBanned: user.isBanned,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
