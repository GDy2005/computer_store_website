import axios from 'axios';

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      value !== undefined && value !== null && value !== ''
    )
  );
}

export async function fetchProducts(params = {}, options = {}) {
  const response = await axios.get('/api/v1/products', {
    params: compactParams(params),
    signal: options.signal
  });

  return {
    items: response.data?.data?.items || [],
    meta: response.data?.meta || {
      page: 1,
      limit: 12,
      totalItems: 0,
      totalPages: 1
    }
  };
}

export async function fetchProductBySlug(slug, options = {}) {
  const response = await axios.get(
    `/api/v1/products/${encodeURIComponent(slug)}`,
    {signal: options.signal}
  );

  return response.data?.data;
}

export async function fetchCategories(options = {}) {
  const response = await axios.get('/api/v1/categories', {
    params: options.featured === undefined
      ? undefined
      : {featured: options.featured},
    signal: options.signal
  });

  return response.data?.data?.items || [];
}

export async function fetchProductFilters(options = {}) {
  const response = await axios.get('/api/v1/products/filters', {
    signal: options.signal
  });

  return response.data?.data || {
    categories: [],
    brands: [],
    priceRange: {min: 0, max: 0}
  };
}

export function catalogErrorMessage(error, fallback) {
  if (error?.code === 'ERR_CANCELED') return '';

  return error?.response?.data?.error?.message || fallback;
}
