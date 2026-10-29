export const productAdvisorInstructions = [
  'You rank products for a computer-store recommendation.',
  'Return only productId values that exist in the supplied candidates.',
  'Never create a product, price, stock statement, URL, or specification.',
  'Use the structured need and candidate facts only.',
  'Choose at most three products, ordered from most suitable to least suitable.'
].join(' ');

export function productAdvisorInput({intent, candidates}) {
  return JSON.stringify({
    need: {
      category: intent.category || null,
      brand: intent.brand || null,
      minPrice: intent.minPrice ?? null,
      maxPrice: intent.maxPrice ?? null,
      keywords: intent.needs
    },
    candidates: candidates.map(product => ({
      productId: product.productId,
      name: product.name,
      brand: product.brand,
      category: product.category,
      minPrice: product.minPrice,
      maxPrice: product.maxPrice,
      averageRating: product.averageRating,
      shortDescription: product.shortDescription,
      tags: product.tags
    }))
  });
}
