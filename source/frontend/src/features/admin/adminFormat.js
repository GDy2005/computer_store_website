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

function localeName(locale) {
  return locale === 'en' ? 'en-US' : 'vi-VN';
}

export function formatAdminMoney(value, locale = 'vi') {
  return Number(value || 0).toLocaleString(localeName(locale), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  });
}

export function formatAdminNumber(value, locale = 'vi') {
  return Number(value || 0).toLocaleString(localeName(locale));
}

export function formatAdminDate(value, {dateOnly = false, locale = 'vi'} = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(localeName(locale), {
    dateStyle: 'medium',
    ...(dateOnly ? {} : {timeStyle: 'short'}),
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date);
}

export function entityId(value) {
  return value?._id || value?.id || '';
}
