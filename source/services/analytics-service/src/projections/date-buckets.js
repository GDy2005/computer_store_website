export const DASHBOARD_TIMEZONE = 'Asia/Ho_Chi_Minh';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateKey(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    throw new RangeError('Date must use YYYY-MM-DD');
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError('Invalid calendar date');
  }

  return parsed;
}

export function dateKey(date, timezone = DASHBOARD_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(value, days) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(startDate, endDate) {
  return Math.round(
    (parseDateKey(endDate) - parseDateKey(startDate)) / 86400000
  );
}

export function enumerateDates(startDate, endDate) {
  const result = [];
  for (
    let current = startDate;
    current <= endDate;
    current = addDays(current, 1)
  ) {
    result.push(current);
  }
  return result;
}

function monthEnd(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export function resolveDashboardRange(query, now = new Date()) {
  const period = query.period || 'month';
  const current = dateKey(now);
  const currentDate = parseDateKey(current);
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();

  if (query.startDate || query.endDate) {
    if (!query.startDate || !query.endDate) {
      throw new RangeError('startDate and endDate must be provided together');
    }
    parseDateKey(query.startDate);
    parseDateKey(query.endDate);
    const span = daysBetween(query.startDate, query.endDate);
    if (span < 0) throw new RangeError('startDate cannot exceed endDate');
    if (span > 365) throw new RangeError('Date range cannot exceed 366 days');
    return {period, startDate: query.startDate, endDate: query.endDate};
  }

  if (period === 'custom') {
    throw new RangeError('Custom period requires startDate and endDate');
  }

  if (period === 'week') {
    const mondayOffset = (currentDate.getUTCDay() + 6) % 7;
    const startDate = addDays(current, -mondayOffset);
    return {period, startDate, endDate: addDays(startDate, 6)};
  }

  if (period === 'month') {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return {
      period,
      startDate: `${prefix}-01`,
      endDate: monthEnd(year, month)
    };
  }

  if (period === 'quarter') {
    const startMonth = Math.floor(month / 3) * 3;
    return {
      period,
      startDate: `${year}-${String(startMonth + 1).padStart(2, '0')}-01`,
      endDate: monthEnd(year, startMonth + 2)
    };
  }

  return {
    period,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`
  };
}
