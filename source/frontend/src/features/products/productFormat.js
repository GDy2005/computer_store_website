const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

export const fallbackProductImage =
  'https://placehold.co/1000x1000/f4f5f1/173f35?text=Computer+Store';

export function formatVnd(value) {
  return vndFormatter.format(Number(value) || 0);
}

export function formatProductPrice(product) {
  if (product.minPrice === product.maxPrice) {
    return formatVnd(product.minPrice);
  }

  return `${formatVnd(product.minPrice)} – ${formatVnd(product.maxPrice)}`;
}

export function productImage(product) {
  return product?.images?.[0]?.url || fallbackProductImage;
}

export function availableProductStock(product) {
  return (product?.variants || []).reduce(
    (total, variant) => total + (variant.availableStock || 0),
    0
  );
}

export function handleImageError(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackProductImage;
}
