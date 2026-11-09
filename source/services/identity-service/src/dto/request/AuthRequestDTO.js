export function toRegisterRequestDTO(body) {
  return {
    email: body.email,
    fullName: body.fullName,
    address: {...body.address}
  };
}

export function toActivateRequestDTO(body) {
  return {token: body.token, password: body.password};
}

export function toLoginRequestDTO(body) {
  return {email: body.email, password: body.password};
}

export function toGoogleUserRequestDTO(body) {
  return {
    providerUserId: body.providerUserId,
    email: body.email,
    fullName: body.fullName
  };
}

export function toForgotPasswordRequestDTO(body) {
  return {email: body.email};
}

export function toResetPasswordRequestDTO(body) {
  return {token: body.token, password: body.password};
}
