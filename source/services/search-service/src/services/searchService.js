export function createSearchService({productSearchRepository}) {
  return {
    search(query) {
      return productSearchRepository.search(query);
    }
  };
}
