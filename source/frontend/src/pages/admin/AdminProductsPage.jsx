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

function ProductActions({product, onDeactivate}) {
  const id = entityId(product);
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button component={Link} to={`/admin/products/${id}/edit`} size="small" variant="outlined">
        Chỉnh sửa
      </Button>
      {product.isActive && (
        <Button size="small" color="error" onClick={() => onDeactivate(product)}>
          Ngừng bán
        </Button>
      )}
    </Stack>
  );
}

export default function AdminProductsPage() {
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
        const message = adminErrorMessage(requestError, 'Không thể tải danh sách sản phẩm.');
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
      setNotice(`Đã ngừng bán ${pendingDeactivate.name}.`);
      setPendingDeactivate(null);
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Không thể ngừng bán sản phẩm.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Sản phẩm & tồn kho"
        description="Quản lý thông tin bán hàng, hình ảnh, biến thể và số lượng tồn kho."
        action={<Button component={Link} to="/admin/products/new" variant="contained">Thêm sản phẩm</Button>}
      />

      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
          <TextField
            label="Tên, slug, thương hiệu hoặc SKU"
            value={draft.search}
            onChange={event => setDraft(current => ({...current, search: event.target.value}))}
            inputProps={{maxLength: 100}}
            fullWidth
          />
          <FormControl sx={{minWidth: {sm: 170}}}>
            <InputLabel id="product-active-filter">Trạng thái</InputLabel>
            <Select
              labelId="product-active-filter"
              label="Trạng thái"
              value={draft.isActive}
              onChange={event => setDraft(current => ({...current, isActive: event.target.value}))}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="true">Đang bán</MenuItem>
              <MenuItem value="false">Ngừng bán</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" sx={{minWidth: 110}}>Lọc</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>Xóa lọc</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label="Đang tải sản phẩm"/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>Không tìm thấy sản phẩm phù hợp.</AdminEmpty>}

      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', md: 'block'}}}>
            <Table aria-label="Danh sách quản trị sản phẩm">
              <TableHead>
                <TableRow>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Danh mục</TableCell>
                  <TableCell>Kho</TableCell>
                  <TableCell>Giá bán</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
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
                        <Typography variant="body2">{formatAdminNumber(stock.stock)} tổng</Typography>
                        <Typography variant="caption" color="text.secondary">{formatAdminNumber(stock.reserved)} đang giữ</Typography>
                      </TableCell>
                      <TableCell>{formatAdminMoney(product.minPrice)} – {formatAdminMoney(product.maxPrice)}</TableCell>
                      <TableCell><Chip size="small" color={product.isActive ? 'success' : 'default'} label={product.isActive ? 'Đang bán' : 'Ngừng bán'}/></TableCell>
                      <TableCell align="right"><ProductActions product={product} onDeactivate={setPendingDeactivate}/></TableCell>
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
                        <Typography variant="body2" color="text.secondary">{product.brand} · {product.categoryId?.name || 'Chưa có danh mục'}</Typography>
                      </Box>
                      <Chip size="small" color={product.isActive ? 'success' : 'default'} label={product.isActive ? 'Đang bán' : 'Ngừng bán'}/>
                    </Stack>
                    <Typography variant="body2">{product.variants?.length || 0} biến thể · Kho {formatAdminNumber(stock.stock)} · Giữ {formatAdminNumber(stock.reserved)}</Typography>
                    <Typography fontWeight={750}>{formatAdminMoney(product.minPrice)} – {formatAdminMoney(product.maxPrice)}</Typography>
                    <ProductActions product={product} onDeactivate={setPendingDeactivate}/>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>

          <AdminPagination meta={result.meta} page={query.page} onChange={changePage} disabled={loading}/>
        </>
      )}

      <Dialog open={Boolean(pendingDeactivate)} onClose={() => !saving && setPendingDeactivate(null)}>
        <DialogTitle>Ngừng bán sản phẩm?</DialogTitle>
        <DialogContent>
          <Typography>
            “{pendingDeactivate?.name}” sẽ bị ẩn khỏi catalog. Dữ liệu cũ và snapshot trong đơn hàng vẫn được giữ lại.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeactivate(null)} disabled={saving}>Quay lại</Button>
          <Button color="error" variant="contained" onClick={confirmDeactivate} disabled={saving}>
            {saving ? 'Đang xử lý…' : 'Ngừng bán'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
