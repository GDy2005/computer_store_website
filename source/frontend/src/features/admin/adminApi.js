import axios from 'axios';

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      value !== undefined && value !== null && value !== ''
    )
  );
}

function listResult(response, fallbackLimit = 20) {
  return {
    items: response.data?.data?.items || [],
    meta: response.data?.meta || {
      page: 1,
      limit: fallbackLimit,
      totalItems: 0,
      totalPages: 1
    }
  };
}

export function adminErrorMessage(error, fallback) {
  if (axios.isCancel(error)) return '';
  return error.response?.data?.error?.message || fallback;
}

export async function fetchAdminProducts(params, options = {}) {
  const response = await axios.get('/api/v1/admin/products', {
    params: compactParams(params),
    signal: options.signal
  });
  return listResult(response);
}

export async function fetchAdminProduct(productId, options = {}) {
  const response = await axios.get(
    `/api/v1/admin/products/${encodeURIComponent(productId)}`,
    {signal: options.signal}
  );
  return response.data.data;
}

export async function createAdminProduct(payload) {
  const response = await axios.post('/api/v1/admin/products', payload);
  return response.data.data;
}

export async function updateAdminProduct(productId, payload) {
  const response = await axios.patch(
    `/api/v1/admin/products/${encodeURIComponent(productId)}`,
    payload
  );
  return response.data.data;
}

export async function deactivateAdminProduct(productId) {
  const response = await axios.delete(
    `/api/v1/admin/products/${encodeURIComponent(productId)}`
  );
  return response.data.data;
}

export async function uploadAdminProductImages(files) {
  const body = new FormData();
  files.forEach(file => body.append('images', file));
  const response = await axios.post(
    '/api/v1/admin/products/images',
    body,
    {headers: {'Content-Type': 'multipart/form-data'}}
  );
  return response.data?.data?.images || [];
}

export async function fetchAdminCategories(options = {}) {
  const response = await axios.get('/api/v1/admin/categories', {
    signal: options.signal
  });
  return response.data?.data?.items || [];
}

export async function createAdminCategory(payload) {
  const response = await axios.post('/api/v1/admin/categories', payload);
  return response.data.data;
}

export async function updateAdminCategory(categoryId, payload) {
  const response = await axios.patch(
    `/api/v1/admin/categories/${encodeURIComponent(categoryId)}`,
    payload
  );
  return response.data.data;
}

export async function deactivateAdminCategory(categoryId) {
  const response = await axios.delete(
    `/api/v1/admin/categories/${encodeURIComponent(categoryId)}`
  );
  return response.data.data;
}

export async function fetchAdminUsers(params, options = {}) {
  const response = await axios.get('/api/v1/admin/users', {
    params: compactParams(params),
    signal: options.signal
  });
  return listResult(response);
}

export async function updateAdminUser(userId, payload) {
  const response = await axios.patch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}`,
    payload
  );
  return response.data.data;
}

export async function setAdminUserBan(userId, isBanned) {
  const response = await axios.patch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/ban`,
    {isBanned}
  );
  return response.data.data;
}

export async function fetchAdminOrders(params, options = {}) {
  const response = await axios.get('/api/v1/admin/orders', {
    params: compactParams(params),
    signal: options.signal
  });
  return listResult(response);
}

export async function fetchAdminOrder(orderId, options = {}) {
  const response = await axios.get(
    `/api/v1/admin/orders/${encodeURIComponent(orderId)}`,
    {signal: options.signal}
  );
  return response.data.data;
}

export async function updateAdminOrderStatus(orderId, payload) {
  const response = await axios.patch(
    `/api/v1/admin/orders/${encodeURIComponent(orderId)}/status`,
    payload
  );
  return response.data.data;
}

export async function fetchAdminCoupons(params, options = {}) {
  const response = await axios.get('/api/v1/admin/coupons', {
    params: compactParams(params),
    signal: options.signal
  });
  return listResult(response);
}

export async function createAdminCoupon(payload) {
  const response = await axios.post('/api/v1/admin/coupons', payload);
  return response.data.data;
}

export async function fetchDashboardSummary(options = {}) {
  const response = await axios.get('/api/v1/admin/dashboard/summary', {
    signal: options.signal
  });
  return response.data.data;
}

export async function fetchDashboardAnalytics(params, options = {}) {
  const response = await axios.get('/api/v1/admin/dashboard/analytics', {
    params: compactParams(params),
    signal: options.signal
  });
  return response.data.data;
}
