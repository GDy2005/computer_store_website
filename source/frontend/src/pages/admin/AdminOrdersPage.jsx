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
  orderStatusColors,
  orderStatusLabels
} from '../../features/admin/adminFormat.js';

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

function OrderActions({order}) {
  return (
    <Button component={Link} to={`/admin/orders/${entityId(order)}`} size="small" variant="outlined">
      Xem chi tiết
    </Button>
  );
}

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => readQuery(params), [paramsKey]);
  const [draft, setDraft] = useState({...query});
  const [result, setResult] = useState({items: [], meta: {totalPages: 1, totalItems: 0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');

  useEffect(() => setDraft({...query}), [paramsKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAdminOrders(query, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        const message = adminErrorMessage(requestError, 'Không thể tải danh sách đơn hàng.');
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
      setFilterError('Ngày bắt đầu không được sau ngày kết thúc.');
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

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Đơn hàng"
        description="Danh sách mới nhất trước; lọc theo trạng thái và khoảng ngày tạo đơn."
      />
      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'minmax(220px, 1.5fr) repeat(3, minmax(150px, 1fr)) auto auto'}, gap: 2}}>
          <TextField label="Mã đơn, tên hoặc email" value={draft.search} onChange={event => setDraft(current => ({...current, search: event.target.value}))} inputProps={{maxLength: 100}}/>
          <FormControl>
            <InputLabel id="order-status-filter">Trạng thái</InputLabel>
            <Select labelId="order-status-filter" label="Trạng thái" value={draft.status} onChange={event => setDraft(current => ({...current, status: event.target.value}))}>
              <MenuItem value="">Tất cả</MenuItem>
              {Object.entries(orderStatusLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Từ ngày" type="date" value={draft.startDate} onChange={event => setDraft(current => ({...current, startDate: event.target.value}))} InputLabelProps={{shrink: true}}/>
          <TextField label="Đến ngày" type="date" value={draft.endDate} onChange={event => setDraft(current => ({...current, endDate: event.target.value}))} InputLabelProps={{shrink: true}}/>
          <Button type="submit" variant="contained">Lọc</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>Xóa lọc</Button>
        </Box>
        {filterError && <Alert severity="warning" sx={{mt: 2}}>{filterError}</Alert>}
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <AdminLoading label="Đang tải đơn hàng"/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>Không tìm thấy đơn hàng phù hợp.</AdminEmpty>}
      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', lg: 'block'}}}>
            <Table aria-label="Danh sách đơn hàng quản trị">
              <TableHead>
                <TableRow>
                  <TableCell>Đơn hàng</TableCell>
                  <TableCell>Khách hàng</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Lợi nhuận</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(order => (
                  <TableRow key={entityId(order)} hover>
                    <TableCell>
                      <Typography fontWeight={850}>{order.orderNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatAdminDate(order.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{order.customer?.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">{order.customer?.email}</Typography>
                    </TableCell>
                    <TableCell>{itemCount(order)}</TableCell>
                    <TableCell>{formatAdminMoney(order.pricing?.total)}</TableCell>
                    <TableCell>{formatAdminMoney(order.pricing?.profit)}</TableCell>
                    <TableCell><Chip size="small" color={orderStatusColors[order.status] || 'default'} label={orderStatusLabels[order.status] || order.status}/></TableCell>
                    <TableCell align="right"><OrderActions order={order}/></TableCell>
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
                      <Typography variant="caption" color="text.secondary">{formatAdminDate(order.createdAt)}</Typography>
                    </Box>
                    <Chip size="small" color={orderStatusColors[order.status] || 'default'} label={orderStatusLabels[order.status] || order.status}/>
                  </Stack>
                  <Typography variant="body2"><strong>{order.customer?.fullName}</strong> · {order.customer?.email}</Typography>
                  <Typography variant="body2">{itemCount(order)} sản phẩm · Tổng {formatAdminMoney(order.pricing?.total)}</Typography>
                  <Typography variant="body2">Lợi nhuận: {formatAdminMoney(order.pricing?.profit)}</Typography>
                  <OrderActions order={order}/>
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
