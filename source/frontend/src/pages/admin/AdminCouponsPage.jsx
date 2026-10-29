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
import {useSearchParams} from 'react-router-dom';
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
import {entityId, formatAdminMoney, formatAdminNumber} from '../../features/admin/adminFormat.js';

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

function discountLabel(coupon) {
  return coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discountValue}%`
    : formatAdminMoney(coupon.discountValue);
}

function usable(coupon) {
  return coupon.isUsable ?? (coupon.isActive && Number(coupon.usedCount || 0) < Number(coupon.usageLimit || 0));
}

export default function AdminCouponsPage() {
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
        const message = adminErrorMessage(requestError, 'Không thể tải danh sách coupon.');
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
      setNotice('Đã tạo coupon mới.');
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Không thể tạo coupon.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Mã giảm giá"
        description="Theo dõi lượt sử dụng và tạo coupon mới; coupon đã được dùng không bị xóa khỏi lịch sử."
        action={<Button variant="contained" onClick={() => setFormOpen(true)}>Tạo coupon</Button>}
      />
      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
          <TextField label="Mã coupon" value={draft.search} onChange={event => setDraft(current => ({...current, search: event.target.value.toUpperCase()}))} inputProps={{maxLength: 5}} fullWidth/>
          <FormControl sx={{minWidth: 180}}>
            <InputLabel id="coupon-active-filter">Trạng thái</InputLabel>
            <Select labelId="coupon-active-filter" label="Trạng thái" value={draft.isActive} onChange={event => setDraft(current => ({...current, isActive: event.target.value}))}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="true">Đang bật</MenuItem>
              <MenuItem value="false">Đã tắt</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained">Lọc</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>Xóa lọc</Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label="Đang tải coupon"/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>Không tìm thấy coupon phù hợp.</AdminEmpty>}
      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', md: 'block'}}}>
            <Table aria-label="Danh sách coupon">
              <TableHead>
                <TableRow>
                  <TableCell>Mã</TableCell>
                  <TableCell>Mức giảm</TableCell>
                  <TableCell align="right">Đã dùng</TableCell>
                  <TableCell align="right">Còn lại</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(coupon => (
                  <TableRow key={entityId(coupon)} hover>
                    <TableCell><Typography fontWeight={900} letterSpacing={1}>{coupon.code}</Typography></TableCell>
                    <TableCell>{discountLabel(coupon)}</TableCell>
                    <TableCell align="right">{formatAdminNumber(coupon.usedCount)} / {formatAdminNumber(coupon.usageLimit)}</TableCell>
                    <TableCell align="right">{formatAdminNumber(coupon.remainingUses ?? Math.max(0, coupon.usageLimit - coupon.usedCount))}</TableCell>
                    <TableCell><Chip size="small" color={usable(coupon) ? 'success' : 'default'} label={usable(coupon) ? 'Có thể dùng' : coupon.isActive ? 'Đã hết lượt' : 'Đã tắt'}/></TableCell>
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
                    <Chip size="small" color={usable(coupon) ? 'success' : 'default'} label={usable(coupon) ? 'Có thể dùng' : coupon.isActive ? 'Đã hết lượt' : 'Đã tắt'}/>
                  </Stack>
                  <Typography>Mức giảm: <strong>{discountLabel(coupon)}</strong></Typography>
                  <Typography variant="body2">Đã dùng {formatAdminNumber(coupon.usedCount)} / {formatAdminNumber(coupon.usageLimit)} · Còn {formatAdminNumber(coupon.remainingUses ?? Math.max(0, coupon.usageLimit - coupon.usedCount))}</Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <AdminPagination meta={result.meta} page={query.page} onChange={changePage}/>
        </>
      )}

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <Box component="form" onSubmit={saveCoupon}>
          <DialogTitle>Tạo coupon</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{pt: 1}}>
              <TextField
                label="Mã coupon"
                value={form.code}
                onChange={event => setForm(current => ({...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')}))}
                required
                inputProps={{minLength: 5, maxLength: 5, pattern: '[A-Z0-9]{5}'}}
                helperText="Đúng 5 ký tự A–Z hoặc 0–9."
              />
              <FormControl required>
                <InputLabel id="coupon-type-label">Loại giảm</InputLabel>
                <Select labelId="coupon-type-label" label="Loại giảm" value={form.discountType} onChange={event => setForm(current => ({...current, discountType: event.target.value}))}>
                  <MenuItem value="PERCENTAGE">Phần trăm</MenuItem>
                  <MenuItem value="FIXED">Số tiền cố định</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={form.discountType === 'PERCENTAGE' ? 'Phần trăm giảm' : 'Số tiền giảm (₫)'}
                type="number"
                value={form.discountValue}
                onChange={event => setForm(current => ({...current, discountValue: event.target.value}))}
                required
                inputProps={{min: 1, max: form.discountType === 'PERCENTAGE' ? 100 : undefined, step: form.discountType === 'PERCENTAGE' ? 1 : 1000}}
              />
              <TextField label="Giới hạn lượt dùng" type="number" value={form.usageLimit} onChange={event => setForm(current => ({...current, usageLimit: event.target.value}))} required inputProps={{min: 1, max: 10, step: 1}} helperText="Theo yêu cầu đề bài: từ 1 đến 10 lượt."/>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={event => setForm(current => ({...current, isActive: event.target.checked}))}/>} label="Kích hoạt ngay"/>
              <Alert severity="info">Theo phạm vi đề bài, quản trị viên chỉ tạo coupon và xem lượt sử dụng; không có chức năng sửa hoặc xóa.</Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Đang tạo…' : 'Tạo coupon'}</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
