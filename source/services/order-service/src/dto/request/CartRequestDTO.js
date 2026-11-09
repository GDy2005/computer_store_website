export class CartRequestDTO {
  static fromItem(body) {
    return {
      productId: body.productId,
      variantId: body.variantId,
      quantity: body.quantity
    };
  }

  static fromQuantity(body) {
    return {quantity: body.quantity};
  }
}
