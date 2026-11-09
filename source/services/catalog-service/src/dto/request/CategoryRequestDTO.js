export class CategoryRequestDTO {
  static from(body) {
    return Object.fromEntries(
      ['name', 'slug', 'description', 'imageUrl', 'isFeatured', 'isActive']
        .filter(field => body[field] !== undefined)
        .map(field => [field, body[field]])
    );
  }
}
