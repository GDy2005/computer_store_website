export const orderStatusLabels = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy'
};

export const orderStatusColors = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPING: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error'
};

export function formatAdminMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  });
}

export function formatAdminNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export function formatAdminDate(value, {dateOnly = false} = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    ...(dateOnly ? {} : {timeStyle: 'short'}),
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date);
}

export function entityId(value) {
  return value?._id || value?.id || '';
}
