const PRODUCT_FIELDS = [
  'name',
  'slug',
  'brand',
  'categoryId',
  'shortDescription',
  'description',
  'images',
  'tags',
  'specifications',
  'variants',
  'isActive'
];

function pick(source, fields) {
  return Object.fromEntries(
    fields
      .filter(field => source[field] !== undefined)
      .map(field => [field, source[field]])
  );
}

export class ProductRequestDTO {
  static fromCreate(body) {
    return pick(body, PRODUCT_FIELDS);
  }

  static fromUpdate(body) {
    return pick(body, PRODUCT_FIELDS);
  }

  static fromQuote(body) {
    return {
      items: (body.items || []).map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      }))
    };
  }
}
