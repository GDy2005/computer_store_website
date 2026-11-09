export class SearchQueryDTO {
  static from(query) {
    return {
      search: query.search,
      category: query.category,
      brand: query.brand,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minRating: query.minRating,
      sort: query.sort,
      page: query.page,
      limit: query.limit
    };
  }
}
