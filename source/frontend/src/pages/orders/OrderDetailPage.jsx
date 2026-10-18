import {useEffect, useState} from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Paper, Stack, Typography
} from '@mui/material';
import {Link, useParams} from 'react-router-dom';
import {
  fetchMyOrder, formatMoney, formatOrderDate,
  orderErrorMessage, statusColors, statusLabels
} from '../../features/orders/orderApi.js';

export default function OrderDetailPage() {
  const {orderNumber} = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchMyOrder(orderNumber, {signal: controller.signal})
      .then(setOrder)
      .catch(requestError => {
        const message = orderErrorMessage(requestError, 'Không thể tải chi tiết đơn hàng.');
        if (message) setError(message);
      });
    return () => controller.abort();
  }, [orderNumber]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!order) return <Box sx={{display: 'grid', placeItems: 'center', minHeight: 300}}><CircularProgress/></Box>;

  const address = order.shippingAddress;
  return (
    <Stack spacing={3} maxWidth={960} mx="auto">
      <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={2}>
        <Box>
          <Button component={Link} to="/orders" sx={{px: 0}}>← Danh sách đơn</Button>
          <Typography component="h1" variant="h4" fontWeight={850}>{order.orderNumber}</Typography>
          <Typography color="text.secondary">Đặt lúc {formatOrderDate(order.createdAt)}</Typography>
        </Box>
        <Chip label={statusLabels[order.status] || order.status} color={statusColors[order.status] || 'default'} sx={{alignSelf: 'flex-start'}}/>
      </Stack>

      {order.cancellationReason && <Alert severity="error">{order.cancellationReason}</Alert>}

      <Paper variant="outlined" sx={{p: {xs: 2.5, sm: 3}}}>
        <Typography component="h2" variant="h6" fontWeight={800} mb={2}>Sản phẩm</Typography>
        <Stack divider={<Divider flexItem/>} spacing={2}>
          {order.items.map(item => (
            <Stack key={item.variantId} direction="row" spacing={2} alignItems="center">
              <Box component="img" src={item.imageUrl} alt={item.productName} sx={{width: 72, height: 72, objectFit: 'contain', bgcolor: 'background.default', borderRadius: 1}}/>
              <Box flexGrow={1}>
                <Typography fontWeight={750}>{item.productName}</Typography>
                <Typography variant="body2" color="text.secondary">{item.variantName} · {item.sku}</Typography>
                <Typography variant="body2">{item.quantity} × {formatMoney(item.unitPrice)}</Typography>
              </Box>
              <Typography fontWeight={750}>{formatMoney(item.lineTotal)}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'}, gap: 3}}>
        <Paper variant="outlined" sx={{p: 3}}>
          <Typography component="h2" variant="h6" fontWeight={800} mb={1}>Giao hàng</Typography>
          <Typography fontWeight={700}>{address.recipientName}</Typography>
          <Typography>{address.phone}</Typography>
          <Typography>{address.addressLine}, {address.ward}, {address.district}, {address.province}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{p: 3}}>
          <Typography component="h2" variant="h6" fontWeight={800} mb={1}>Thanh toán</Typography>
          <Typography>Phương thức: {order.payment.method === 'COD' ? 'Thanh toán khi nhận hàng' : 'Thanh toán online mô phỏng'}</Typography>
          <Divider sx={{my: 1.5}}/>
          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between"><span>Tạm tính</span><span>{formatMoney(order.pricing.subtotal)}</span></Stack>
            <Stack direction="row" justifyContent="space-between"><span>Giảm giá</span><span>-{formatMoney(order.pricing.discountAmount)}</span></Stack>
            {order.pricing.pointsDiscount > 0 && <Stack direction="row" justifyContent="space-between"><span>Đổi {order.loyalty.pointsUsed} điểm</span><span>-{formatMoney(order.pricing.pointsDiscount)}</span></Stack>}
            <Stack direction="row" justifyContent="space-between"><span>Phí giao hàng</span><span>{formatMoney(order.pricing.shippingFee)}</span></Stack>
            <Stack direction="row" justifyContent="space-between"><strong>Tổng cộng</strong><strong>{formatMoney(order.pricing.total)}</strong></Stack>
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{p: 3}}>
        <Typography component="h2" variant="h6" fontWeight={800} mb={2}>Lịch sử trạng thái</Typography>
        <Stack spacing={2}>
          {order.statusHistory.map((entry, index) => (
            <Box key={`${entry.status}-${entry.updatedAt}-${index}`} sx={{borderLeft: '3px solid', borderColor: `${statusColors[entry.status] || 'grey'}.main`, pl: 2}}>
              <Typography fontWeight={750}>{statusLabels[entry.status] || entry.status}</Typography>
              <Typography variant="body2" color="text.secondary">{formatOrderDate(entry.updatedAt)}</Typography>
              {entry.note && <Typography variant="body2">{entry.note}</Typography>}
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
