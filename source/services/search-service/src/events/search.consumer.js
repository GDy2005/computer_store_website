export function createSearchConsumers({searchIndex, catalogClient}) {
  async function syncProduct(event) {
    if (!event.payload.isActive) {
      await searchIndex.deleteProduct(event.payload.productId);
      return;
    }

    const product = await catalogClient.getProductBySlug(
      event.payload.slug
    );
    await searchIndex.indexProduct(product);
  }

  return [
    {
      topic: 'products.created.v1',
      groupId: 'search-products-created-group',
      handler: syncProduct
    },
    {
      topic: 'products.updated.v1',
      groupId: 'search-products-updated-group',
      handler: syncProduct
    },
    {
      topic: 'ratings.updated.v1',
      groupId: 'search-ratings-updated-group',
      handler(event) {
        return searchIndex.updateRating(event.payload);
      }
    }
  ];
}
