export function createSearchService({searchIndex}) {
  return {
    search(query) {
      return searchIndex.search(query);
    }
  };
}
