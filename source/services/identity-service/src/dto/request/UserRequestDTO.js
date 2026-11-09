export function toUpdateUserRequestDTO(body) {
  return {
    ...(body.fullName !== undefined
      ? {fullName: body.fullName}
      : {}),
    ...(body.phone !== undefined ? {phone: body.phone} : {})
  };
}

export function toChangePasswordRequestDTO(body) {
  return {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword
  };
}

export function toAdminUserUpdateRequestDTO(body) {
  return toUpdateUserRequestDTO(body);
}

export function toAdminUserBanRequestDTO(body) {
  return {isBanned: body.isBanned};
}
