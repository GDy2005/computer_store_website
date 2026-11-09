function plain(value) {
  return typeof value?.toObject === 'function'
    ? value.toObject({flattenMaps: true})
    : value;
}

export class ProductResponseDTO {
  static public(value) {
    const product = plain(value);
    const variants = (product.variants || [])
      .filter(variant => variant.isActive)
      .map(variant => {
        const publicVariant = {...variant};
        const reservedStock = publicVariant.reservedStock || 0;

        delete publicVariant.costPrice;
        delete publicVariant.reservedStock;

        return {
          ...publicVariant,
          availableStock: Math.max(
            0,
            publicVariant.stock - reservedStock
          )
        };
      });

    return {...product, variants};
  }

  static publicList(values) {
    return values.map(value => this.public(value));
  }

  static admin(value) {
    return plain(value);
  }
}
