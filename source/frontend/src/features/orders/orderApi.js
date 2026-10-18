import axios from 'axios';

export async function fetchMyOrders(page = 1, options = {}) {
  const response = await axios.get('/api/v1/orders/me', {
    params: {page, limit: 10},
    signal: options.signal
  });

  return {
    items: response.data.data.items,
    meta: response.data.meta
  };
}

export async function fetchMyOrder(orderNumber, options = {}) {
  const response = await axios.get(
    `/api/v1/orders/me/${encodeURIComponent(orderNumber)}`,
    {signal: options.signal}
  );

  return response.data.data;
}

export function orderErrorMessage(error, fallback) {
  if (axios.isCancel(error)) return '';
  return error.response?.data?.error?.message || fallback;
}

export function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });
}

export function formatOrderDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value));
}

export const statusLabels = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy'
};

export const statusColors = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPING: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error'
};
