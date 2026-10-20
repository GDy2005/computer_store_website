import axios from 'axios';

export async function fetchComments(productId, page = 1, options = {}) {
  const response = await axios.get(
    `/api/v1/products/${encodeURIComponent(productId)}/comments`,
    {
      params: {page, limit: 10},
      signal: options.signal
    }
  );

  return {
    items: response.data?.data?.items || [],
    meta: response.data?.meta || {
      page,
      limit: 10,
      totalItems: 0,
      totalPages: 1
    }
  };
}

export async function createComment(productId, input) {
  const response = await axios.post(
    `/api/v1/products/${encodeURIComponent(productId)}/comments`,
    input
  );
  return response.data?.data;
}

export async function fetchRatingSummary(productId, options = {}) {
  const response = await axios.get(
    `/api/v1/products/${encodeURIComponent(productId)}/ratings`,
    {signal: options.signal}
  );
  return response.data?.data;
}

export async function updateRating(productId, stars) {
  const response = await axios.put(
    `/api/v1/products/${encodeURIComponent(productId)}/rating`,
    {stars}
  );
  return response.data?.data;
}

export function feedbackErrorMessage(error, fallback) {
  if (error?.code === 'ERR_CANCELED') return '';
  return error?.response?.data?.error?.message || fallback;
}
