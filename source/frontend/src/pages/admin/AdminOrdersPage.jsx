import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {Link, useSearchParams} from 'react-router-dom';
import {adminErrorMessage, fetchAdminOrders} from '../../features/admin/adminApi.js';
import {
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminPagination
} from '../../features/admin/AdminUi.jsx';
import {
  entityId,
  formatAdminDate,
  formatAdminMoney,
  orderStatusColors
} from '../../features/admin/adminFormat.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

function vietnamDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function presetRange(preset) {
  const today = vietnamDateKey();
  if (preset === 'today') return {startDate: today, endDate: today};
  if (preset === 'yesterday') {
    const yesterday = shiftDateKey(today, -1);
    return {startDate: yesterday, endDate: yesterday};
  }
  if (preset === 'week') {
    const day = new Date(`${today}T00:00:00.000Z`).getUTCDay();
    return {
      startDate: shiftDateKey(today, -((day + 6) % 7)),
      endDate: today
    };
  }
  if (preset === 'month') {
    return {startDate: `${today.slice(0, 7)}-01`, endDate: today};
  }
  return {startDate: '', endDate: ''};
}

function readQuery(params) {
  const page = Number(params.get('page') || 1);
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    limit: 20,
    search: params.get('search') || '',
    status: params.get('status') || '',
    startDate: params.get('startDate') || '',
    endDate: params.get('endDate') || ''
  };
}

function itemCount(order) {
  if (Number.isFinite(order.itemCount)) return order.itemCount;
  return (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function OrderActions({order, t}) {
  return (
    <Button component={Link} to={`/admin/orders/${entityId(order)}`} size="small" variant="outlined">
      {t('admin.orders.viewDetail')}
    </Button>
  );
}

export default function AdminOrdersPage() {
  const {locale, t} = useLanguage();
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => readQuery(params), [paramsKey]);
  const [draft, setDraft] = useState({...query, datePreset: ''});
  const [result, setResult] = useState({items: [], meta: {totalPages: 1, totalItems: 0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');

  useEffect(() => setDraft({...query, datePreset: ''}), [paramsKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAdminOrders(query, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        const message = adminErrorMessage(requestError, t('admin.orders.loadError'));
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [paramsKey]);

  function applyFilters(event) {
    event.preventDefault();
    setFilterError('');
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
      setFilterError(t('admin.orders.dateError'));
      return;
    }
    const next = new URLSearchParams();
    for (const field of ['search', 'status', 'startDate', 'endDate']) {
      const value = String(draft[field] || '').trim();
      if (value) next.set(field, value);
    }
    setParams(next);
  }

  function changePage(_, page) {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setParams(next);
  }

  function changeDatePreset(value) {
    setDraft(current => ({
      ...current,
      datePreset: value,
      ...(value === 'custom'
        ? {}
        : presetRange(value))
    }));
  }

  function clearFilters() {
    setDraft({...readQuery(new URLSearchParams()), datePreset: ''});
    setParams({});
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={t('admin.orders.title')}
        description={t('admin.orders.description')}
      />
      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'minmax(220px, 1.5fr) repeat(4, minmax(150px, 1fr)) auto auto'}, gap: 2}}>
          <TextField label={t('admin.orders.search')} value={draft.search} onChange={event => setDraft(current => ({...current, search: event.target.value}))} inputProps={{maxLength: 100}}/>
          <FormControl>
            <InputLabel id="order-status-filter">{t('admin.common.status')}</InputLabel>
            <Select labelId="order-status-filter" label={t('admin.common.status')} value={draft.status} onChange={event => setDraft(current => ({...current, status: event.target.value}))}>
              <MenuItem value="">{t('admin.common.all')}</MenuItem>
              {orderStatuses.map(value => <MenuItem key={value} value={value}>{t(`status.${value}`)}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel id="order-date-preset">{t('admin.orders.datePreset')}</InputLabel>
            <Select
              labelId="order-date-preset"
              label={t('admin.orders.datePreset')}
              value={draft.datePreset}
              onChange={event => changeDatePreset(event.target.value)}
            >
              <MenuItem value="">{t('admin.common.all')}</MenuItem>
              <MenuItem value="today">{t('admin.orders.today')}</MenuItem>
              <MenuItem value="yesterday">{t('admin.orders.yesterday')}</MenuItem>
              <MenuItem value="week">{t('admin.orders.thisWeek')}</MenuItem>
              <MenuItem value="month">{t('admin.orders.thisMonth')}</MenuItem>
              <MenuItem value="custom">{t('admin.orders.customRange')}</MenuItem>
            </Select>
          </FormControl>
          <TextField label={t('admin.orders.startDate')} type="date" value={draft.startDate} onChange={event => setDraft(current => ({...current, startDate: event.target.value}))} InputLabelProps={{shrink: true}}/>
          <TextField label={t('admin.orders.endDate')} type="date" value={draft.endDate} onChange={event => setDraft(current => ({...current, endDate: event.target.value}))} InputLabelProps={{shrink: true}}/>
          <Button type="submit" variant="contained">{t('admin.common.filter')}</Button>
          <Button type="button" color="inherit" onClick={clearFilters}>{t('admin.common.clearFilters')}</Button>
        </Box>
        {filterError && <Alert severity="warning" sx={{mt: 2}}>{filterError}</Alert>}
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <AdminLoading label={t('admin.orders.loading')}/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>{t('admin.orders.empty')}</AdminEmpty>}
      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', lg: 'block'}}}>
            <Table aria-label={t('admin.orders.listAria')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.orders.order')}</TableCell>
                  <TableCell>{t('admin.orders.customer')}</TableCell>
                  <TableCell>{t('admin.orders.products')}</TableCell>
                  <TableCell>{t('admin.orders.total')}</TableCell>
                  <TableCell>{t('admin.orders.profit')}</TableCell>
                  <TableCell>{t('admin.common.status')}</TableCell>
                  <TableCell align="right">{t('admin.common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(order => (
                  <TableRow key={entityId(order)} hover>
                    <TableCell>
                      <Typography fontWeight={850}>{order.orderNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatAdminDate(order.createdAt, {locale})}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{order.customer?.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">{order.customer?.email}</Typography>
                    </TableCell>
                    <TableCell>{itemCount(order)}</TableCell>
                    <TableCell>{formatAdminMoney(order.pricing?.total, locale)}</TableCell>
                    <TableCell>{formatAdminMoney(order.pricing?.profit, locale)}</TableCell>
                    <TableCell><Chip size="small" color={orderStatusColors[order.status] || 'default'} label={t(`status.${order.status}`)}/></TableCell>
                    <TableCell align="right"><OrderActions order={order} t={t}/></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack spacing={2} sx={{display: {xs: 'flex', lg: 'none'}}}>
            {result.items.map(order => (
              <Paper key={entityId(order)} variant="outlined" sx={{p: 2.25}}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
                    <Box>
                      <Typography fontWeight={850}>{order.orderNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatAdminDate(order.createdAt, {locale})}</Typography>
                    </Box>
                    <Chip size="small" color={orderStatusColors[order.status] || 'default'} label={t(`status.${order.status}`)}/>
                  </Stack>
                  <Typography variant="body2"><strong>{order.customer?.fullName}</strong> · {order.customer?.email}</Typography>
                  <Typography variant="body2">{t('admin.orders.mobileSummary', {count: itemCount(order), total: formatAdminMoney(order.pricing?.total, locale)})}</Typography>
                  <Typography variant="body2">{t('admin.orders.mobileProfit', {profit: formatAdminMoney(order.pricing?.profit, locale)})}</Typography>
                  <OrderActions order={order} t={t}/>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <AdminPagination meta={result.meta} page={query.page} onChange={changePage}/>
        </>
      )}
    </Stack>
  );
}
