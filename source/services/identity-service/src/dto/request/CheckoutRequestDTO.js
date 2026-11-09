export function toCheckoutUserRequestDTO(body) {
  return {
    email: body.email,
    fullName: body.fullName,
    phone: body.phone,
    address: {...body.address}
  };
}
