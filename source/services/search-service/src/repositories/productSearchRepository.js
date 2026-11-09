export function createProductSearchRepository({searchIndex}) {
  return {
    search(query) {
      return searchIndex.search(query);
    },

    ensureIndex() {
      return searchIndex.ensureIndex();
    },

    ready() {
      return searchIndex.ready();
    },

    indexProduct(product) {
      return searchIndex.indexProduct(product);
    },

    deleteProduct(productId) {
      return searchIndex.deleteProduct(productId);
    },

    updateRating(payload) {
      return searchIndex.updateRating(payload);
    },

    clearProducts() {
      return searchIndex.clearProducts();
    }
  };
}
