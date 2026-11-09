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
import {
  adminErrorMessage,
  deactivateAdminProduct,
  fetchAdminProducts
} from '../../features/admin/adminApi.js';
import {
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminPagination
} from '../../features/admin/AdminUi.jsx';
import {entityId, formatAdminMoney, formatAdminNumber} from '../../features/admin/adminFormat.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

function readQuery(params) {
  const rawPage = Number(params.get('page') || 1);
  return {
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    limit: 20,
    search: params.get('search') || '',
    isActive: params.get('isActive') || ''
  };
}

function inventory(product) {
  const variants = product.variants || [];
  return variants.reduce((summary, variant) => ({
    stock: summary.stock + Number(variant.stock || 0),
    reserved: summary.reserved + Number(variant.reservedStock || 0)
  }), {stock: 0, reserved: 0});
}

function ProductActions({product, onDeactivate, t}) {
  const id = entityId(product);
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button component={Link} to={`/admin/products/${id}/edit`} size="small" variant="outlined">
        {t('admin.common.edit')}
      </Button>
      {product.isActive && (
        <Button size="small" color="error" onClick={() => onDeactivate(product)}>
          {t('admin.products.stopped')}
        </Button>
      )}
    </Stack>
  );
}

export default function AdminProductsPage() {
  const {locale, t} = useLanguage();
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => readQuery(params), [paramsKey]);
  const [draft, setDraft] = useState({search: query.search, isActive: query.isActive});
  const [result, setResult] = useState({items: [], meta: {totalPages: 1, totalItems: 0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingDeactivate, setPendingDeactivate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({search: query.search, isActive: query.isActive});
  }, [paramsKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAdminProducts(query, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        const message = adminErrorMessage(requestError, t('admin.products.loadError'));
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
    if (draft.search.trim()) next.set('search', draft.search.trim());
    if (draft.isActive !== '') next.set('isActive', draft.isActive);
    setParams(next);
  }

  function changePage(_, page) {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setParams(next);
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate) return;
    setSaving(true);
    setError('');
    try {
      await deactivateAdminProduct(entityId(pendingDeactivate));
      setNotice(t('admin.products.deactivated', {name: pendingDeactivate.name}));
      setPendingDeactivate(null);
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, t('admin.products.deactivateError')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={t('admin.products.title')}
        description={t('admin.products.description')}
        action={<Button component={Link} to="/admin/products/new" variant="contained">{t('admin.products.add')}</Button>}
      />

      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
          <TextField
            label={t('admin.products.search')}
            value={draft.search}
            onChange={event => setDraft(current => ({...current, search: event.target.value}))}
            inputProps={{maxLength: 100}}
            fullWidth
          />
          <FormControl sx={{minWidth: {sm: 170}}}>
            <InputLabel id="product-active-filter">{t('admin.common.status')}</InputLabel>
            <Select
              labelId="product-active-filter"
              label={t('admin.common.status')}
              value={draft.isActive}
              onChange={event => setDraft(current => ({...current, isActive: event.target.value}))}
            >
              <MenuItem value="">{t('admin.common.all')}</MenuItem>
              <MenuItem value="true">{t('admin.products.selling')}</MenuItem>
              <MenuItem value="false">{t('admin.products.stopped')}</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" sx={{minWidth: 110}}>{t('admin.common.filter')}</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>{t('admin.common.clearFilters')}</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label={t('admin.products.loading')}/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>{t('admin.products.empty')}</AdminEmpty>}

      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', md: 'block'}}}>
            <Table aria-label={t('admin.products.listAria')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.products.product')}</TableCell>
                  <TableCell>{t('admin.products.category')}</TableCell>
                  <TableCell>{t('admin.products.inventory')}</TableCell>
                  <TableCell>{t('admin.products.price')}</TableCell>
                  <TableCell>{t('admin.common.status')}</TableCell>
                  <TableCell align="right">{t('admin.common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(product => {
                  const stock = inventory(product);
                  return (
                    <TableRow key={entityId(product)} hover>
                      <TableCell>
                        <Typography fontWeight={800}>{product.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{product.brand} · {product.slug}</Typography>
                      </TableCell>
                      <TableCell>{product.categoryId?.name || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{t('admin.products.totalStock', {count: formatAdminNumber(stock.stock, locale)})}</Typography>
                        <Typography variant="caption" color="text.secondary">{t('admin.products.reservedStock', {count: formatAdminNumber(stock.reserved, locale)})}</Typography>
                      </TableCell>
                      <TableCell>{formatAdminMoney(product.minPrice, locale)} – {formatAdminMoney(product.maxPrice, locale)}</TableCell>
                      <TableCell><Chip size="small" color={product.isActive ? 'success' : 'default'} label={product.isActive ? t('admin.products.selling') : t('admin.products.stopped')}/></TableCell>
                      <TableCell align="right"><ProductActions product={product} onDeactivate={setPendingDeactivate} t={t}/></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack spacing={2} sx={{display: {xs: 'flex', md: 'none'}}}>
            {result.items.map(product => {
              const stock = inventory(product);
              return (
                <Paper key={entityId(product)} variant="outlined" sx={{p: 2.25}}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
                      <Box>
                        <Typography fontWeight={850}>{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{product.brand} · {product.categoryId?.name || t('admin.products.noCategory')}</Typography>
                      </Box>
                      <Chip size="small" color={product.isActive ? 'success' : 'default'} label={product.isActive ? t('admin.products.selling') : t('admin.products.stopped')}/>
                    </Stack>
                    <Typography variant="body2">{t('admin.products.mobileSummary', {variants: product.variants?.length || 0, stock: formatAdminNumber(stock.stock, locale), reserved: formatAdminNumber(stock.reserved, locale)})}</Typography>
                    <Typography fontWeight={750}>{formatAdminMoney(product.minPrice, locale)} – {formatAdminMoney(product.maxPrice, locale)}</Typography>
                    <ProductActions product={product} onDeactivate={setPendingDeactivate} t={t}/>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>

          <AdminPagination meta={result.meta} page={query.page} onChange={changePage} disabled={loading}/>
        </>
      )}

      <Dialog open={Boolean(pendingDeactivate)} onClose={() => !saving && setPendingDeactivate(null)}>
        <DialogTitle>{t('admin.products.deactivateTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('admin.products.deactivateConfirm', {name: pendingDeactivate?.name})}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeactivate(null)} disabled={saving}>{t('admin.common.back')}</Button>
          <Button color="error" variant="contained" onClick={confirmDeactivate} disabled={saving}>
            {saving ? t('admin.common.processing') : t('admin.products.stopped')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
