import {useEffect, useMemo, useState} from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress,
  Pagination, Paper, Stack, Typography
} from '@mui/material';
import {Link, useSearchParams} from 'react-router-dom';
import {
  fetchMyOrders, formatMoney, formatOrderDate,
  orderErrorMessage, statusColors, statusLabels
} from '../../features/orders/orderApi.js';

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = useMemo(() => {
    const value = Number(params.get('page') || 1);
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }, [params.toString()]);
  const [result, setResult] = useState({
    items: [], meta: {page: 1, totalItems: 0, totalPages: 1}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchMyOrders(page, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        const message = orderErrorMessage(
          requestError, 'Không thể tải lịch sử đơn hàng.'
        );
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page]);

  function changePage(_, nextPage) {
    setParams(nextPage === 1 ? {} : {page: String(nextPage)});
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  return (
    <Stack spacing={3} maxWidth={900} mx="auto">
      <Box>
        <Typography component="p" variant="overline" color="secondary.main" fontWeight={800}>
          Tài khoản
        </Typography>
        <Typography component="h1" variant="h4" fontWeight={850}>Đơn hàng của tôi</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>
          Theo dõi các đơn hàng đã đặt và lịch sử xử lý.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Box sx={{display: 'grid', placeItems: 'center', minHeight: 240}}><CircularProgress/></Box>}
      {!loading && !error && result.items.length === 0 && (
        <Paper variant="outlined" sx={{p: 4, textAlign: 'center'}}>
          <Typography fontWeight={750}>Bạn chưa có đơn hàng nào.</Typography>
          <Button component={Link} to="/products" sx={{mt: 2}}>Xem sản phẩm</Button>
        </Paper>
      )}
      {!loading && result.items.map(order => (
        <Paper key={order.orderNumber} variant="outlined" sx={{p: {xs: 2.5, sm: 3}}}>
          <Stack spacing={2}>
            <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={1}>
              <Box>
                <Typography fontWeight={850}>{order.orderNumber}</Typography>
                <Typography variant="body2" color="text.secondary">{formatOrderDate(order.createdAt)}</Typography>
              </Box>
              <Chip label={statusLabels[order.status] || order.status} color={statusColors[order.status] || 'default'}/>
            </Stack>
            <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems={{sm: 'center'}} gap={1}>
              <Typography>{order.itemCount} sản phẩm · <strong>{formatMoney(order.pricing.total)}</strong></Typography>
              <Button component={Link} to={`/orders/${order.orderNumber}`} variant="outlined">Xem chi tiết</Button>
            </Stack>
          </Stack>
        </Paper>
      ))}

      {!loading && !error && (
        <Stack alignItems="center" spacing={1}>
          <Pagination count={Math.max(1, result.meta.totalPages)} page={Math.min(page, Math.max(1, result.meta.totalPages))} onChange={changePage}/>
          <Typography variant="caption" color="text.secondary">
            Trang {Math.min(page, Math.max(1, result.meta.totalPages))} / {Math.max(1, result.meta.totalPages)}
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}
