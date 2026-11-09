import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {Link, useSearchParams} from 'react-router-dom';
import {
  adminErrorMessage,
  createAdminCoupon,
  fetchAdminCoupons
} from '../../features/admin/adminApi.js';
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
  formatAdminNumber
} from '../../features/admin/adminFormat.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

const emptyCoupon = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  usageLimit: '',
  isActive: true
};

function readQuery(params) {
  const page = Number(params.get('page') || 1);
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    limit: 20,
    search: params.get('search') || '',
    isActive: params.get('isActive') || ''
  };
}

function discountLabel(coupon, locale) {
  return coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discountValue}%`
    : formatAdminMoney(coupon.discountValue, locale);
}

function usable(coupon) {
  return coupon.isUsable ?? (coupon.isActive && Number(coupon.usedCount || 0) < Number(coupon.usageLimit || 0));
}

function AppliedOrders({coupon, locale, t}) {
  if (!coupon.appliedOrders?.length) {
    return <Typography variant="caption" color="text.secondary">{t('admin.coupons.noOrders')}</Typography>;
  }

  return (
    <Stack spacing={0.5} alignItems="flex-start">
      {coupon.appliedOrders.map(order => (
        <Button
          key={order.id}
          component={Link}
          to={`/admin/orders/${order.id}`}
          size="small"
          variant="text"
          sx={{p: 0, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left'}}
        >
          {order.orderNumber} · {formatAdminMoney(order.total, locale)}
        </Button>
      ))}
    </Stack>
  );
}

export default function AdminCouponsPage() {
  const {locale, t} = useLanguage();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => readQuery(params), [paramsKey]);
  const [draft, setDraft] = useState({search: query.search, isActive: query.isActive});
  const [result, setResult] = useState({items: [], meta: {totalPages: 1, totalItems: 0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft({search: query.search, isActive: query.isActive}), [paramsKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAdminCoupons(query, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        const message = adminErrorMessage(requestError, t('admin.coupons.loadError'));
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [paramsKey, refreshKey]);

  function applyFilters(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (draft.search.trim()) next.set('search', draft.search.trim().toUpperCase());
    if (draft.isActive !== '') next.set('isActive', draft.isActive);
    setParams(next);
  }

  function changePage(_, page) {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setParams(next);
  }

  async function saveCoupon(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createAdminCoupon({
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        usageLimit: Number(form.usageLimit),
        isActive: form.isActive
      });
      setFormOpen(false);
      setForm(emptyCoupon);
      setNotice(t('admin.coupons.created'));
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, t('admin.coupons.createError')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={t('admin.coupons.title')}
        description={t('admin.coupons.description')}
        action={<Button variant="contained" onClick={() => setFormOpen(true)}>{t('admin.coupons.create')}</Button>}
      />
      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
          <TextField label={t('admin.coupons.code')} value={draft.search} onChange={event => setDraft(current => ({...current, search: event.target.value.toUpperCase()}))} inputProps={{maxLength: 5}} fullWidth/>
          <FormControl sx={{minWidth: 180}}>
            <InputLabel id="coupon-active-filter">{t('admin.common.status')}</InputLabel>
            <Select labelId="coupon-active-filter" label={t('admin.common.status')} value={draft.isActive} onChange={event => setDraft(current => ({...current, isActive: event.target.value}))}>
              <MenuItem value="">{t('admin.common.all')}</MenuItem>
              <MenuItem value="true">{t('admin.coupons.enabled')}</MenuItem>
              <MenuItem value="false">{t('admin.coupons.disabled')}</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained">{t('admin.common.filter')}</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>{t('admin.common.clearFilters')}</Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label={t('admin.coupons.loading')}/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>{t('admin.coupons.empty')}</AdminEmpty>}
      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', md: 'block'}}}>
            <Table aria-label={t('admin.coupons.listAria')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.coupons.codeShort')}</TableCell>
                  <TableCell>{t('admin.coupons.createdAt')}</TableCell>
                  <TableCell>{t('admin.coupons.discount')}</TableCell>
                  <TableCell align="right">{t('admin.coupons.used')}</TableCell>
                  <TableCell align="right">{t('admin.coupons.remaining')}</TableCell>
                  <TableCell>{t('admin.coupons.appliedOrders')}</TableCell>
                  <TableCell>{t('admin.common.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(coupon => (
                  <TableRow key={entityId(coupon)} hover>
                    <TableCell><Typography fontWeight={900} letterSpacing={1}>{coupon.code}</Typography></TableCell>
                    <TableCell>{formatAdminDate(coupon.createdAt, {locale})}</TableCell>
                    <TableCell>{discountLabel(coupon, locale)}</TableCell>
                    <TableCell align="right">{formatAdminNumber(coupon.usedCount, locale)} / {formatAdminNumber(coupon.usageLimit, locale)}</TableCell>
                    <TableCell align="right">{formatAdminNumber(coupon.remainingUses ?? Math.max(0, coupon.usageLimit - coupon.usedCount), locale)}</TableCell>
                    <TableCell><AppliedOrders coupon={coupon} locale={locale} t={t}/></TableCell>
                    <TableCell><Chip size="small" color={usable(coupon) ? 'success' : 'default'} label={usable(coupon) ? t('admin.coupons.usable') : coupon.isActive ? t('admin.coupons.exhausted') : t('admin.coupons.disabled')}/></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack spacing={2} sx={{display: {xs: 'flex', md: 'none'}}}>
            {result.items.map(coupon => (
              <Paper key={entityId(coupon)} variant="outlined" sx={{p: 2.25}}>
                <Stack spacing={1.25}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={900} letterSpacing={1}>{coupon.code}</Typography>
                    <Chip size="small" color={usable(coupon) ? 'success' : 'default'} label={usable(coupon) ? t('admin.coupons.usable') : coupon.isActive ? t('admin.coupons.exhausted') : t('admin.coupons.disabled')}/>
                  </Stack>
                  <Typography>{t('admin.coupons.discountSummary', {value: discountLabel(coupon, locale)})}</Typography>
                  <Typography variant="body2">{t('admin.coupons.createdSummary', {date: formatAdminDate(coupon.createdAt, {locale})})}</Typography>
                  <Typography variant="body2">{t('admin.coupons.usageSummary', {used: formatAdminNumber(coupon.usedCount, locale), limit: formatAdminNumber(coupon.usageLimit, locale), remaining: formatAdminNumber(coupon.remainingUses ?? Math.max(0, coupon.usageLimit - coupon.usedCount), locale)})}</Typography>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('admin.coupons.appliedOrders')}</Typography>
                    <AppliedOrders coupon={coupon} locale={locale} t={t}/>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <AdminPagination meta={result.meta} page={query.page} onChange={changePage}/>
        </>
      )}

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <Box component="form" onSubmit={saveCoupon}>
          <DialogTitle>{t('admin.coupons.create')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{pt: 1}}>
              <TextField
                label={t('admin.coupons.code')}
                value={form.code}
                onChange={event => setForm(current => ({...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')}))}
                required
                inputProps={{minLength: 5, maxLength: 5, pattern: '[A-Z0-9]{5}'}}
                helperText={t('admin.coupons.codeHelp')}
              />
              <FormControl required>
                <InputLabel id="coupon-type-label">{t('admin.coupons.discountType')}</InputLabel>
                <Select labelId="coupon-type-label" label={t('admin.coupons.discountType')} value={form.discountType} onChange={event => setForm(current => ({...current, discountType: event.target.value}))}>
                  <MenuItem value="PERCENTAGE">{t('admin.coupons.percentage')}</MenuItem>
                  <MenuItem value="FIXED">{t('admin.coupons.fixed')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={form.discountType === 'PERCENTAGE' ? t('admin.coupons.percentageValue') : t('admin.coupons.fixedValue')}
                type="number"
                value={form.discountValue}
                onChange={event => setForm(current => ({...current, discountValue: event.target.value}))}
                required
                inputProps={{min: 1, max: form.discountType === 'PERCENTAGE' ? 100 : undefined, step: form.discountType === 'PERCENTAGE' ? 1 : 1000}}
              />
              <TextField label={t('admin.coupons.usageLimit')} type="number" value={form.usageLimit} onChange={event => setForm(current => ({...current, usageLimit: event.target.value}))} required inputProps={{min: 1, max: 10, step: 1}} helperText={t('admin.coupons.usageHelp')}/>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={event => setForm(current => ({...current, isActive: event.target.checked}))}/>} label={t('admin.coupons.activateNow')}/>
              <Alert severity="info">{t('admin.coupons.scopeNotice')}</Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>{t('admin.common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? t('admin.coupons.creating') : t('admin.coupons.create')}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
