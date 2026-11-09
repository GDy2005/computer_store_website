export class CheckoutRequestDTO {
  static fromPreview(body) {
    return {
      couponCode: body.couponCode,
      pointsToRedeem: body.pointsToRedeem || 0
    };
  }

  static fromPlace(body) {
    return {
      checkoutId: body.checkoutId,
      customer: body.customer,
      shippingAddress: body.shippingAddress,
      couponCode: body.couponCode,
      pointsToRedeem: body.pointsToRedeem || 0,
      paymentMethod: body.paymentMethod,
      paymentCard: body.paymentCard
    };
  }
}
