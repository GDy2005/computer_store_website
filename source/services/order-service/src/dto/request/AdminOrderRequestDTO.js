export class AdminOrderRequestDTO {
  static fromStatus(body) {
    return {status: body.status, note: body.note};
  }

  static fromCoupon(body) {
    return Object.fromEntries(
      [
        'code',
        'discountType',
        'discountValue',
        'maximumDiscount',
        'minimumOrder',
        'usageLimit',
        'startsAt',
        'expiresAt',
        'isActive'
      ]
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
    );
  }
}
