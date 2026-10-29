import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {Link, useParams} from 'react-router-dom';
import {
  adminErrorMessage,
  fetchAdminOrder,
  updateAdminOrderStatus
} from '../../features/admin/adminApi.js';
import {AdminLoading, AdminPageHeader} from '../../features/admin/AdminUi.jsx';
import {
  formatAdminDate,
  formatAdminMoney,
  orderStatusColors,
  orderStatusLabels
} from '../../features/admin/adminFormat.js';

const nextStatuses = {
  PENDING: ['CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const paymentMethodLabels = {
  COD: 'Thanh toán khi nhận hàng',
  SIMULATED_ONLINE: 'Thanh toán online mô phỏng'
};

const paymentStatusLabels = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại'
};

function MoneyRow({label, value, strong = false, negative = false}) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography fontWeight={strong ? 850 : 400}>{label}</Typography>
      <Typography fontWeight={strong ? 900 : 650}>{negative ? '−' : ''}{formatAdminMoney(value)}</Typography>
    </Stack>
  );
}

export default function AdminOrderDetailPage() {
  const {id} = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(signal) {
    setLoading(true);
    setError('');
    try {
      setOrder(await fetchAdminOrder(id, {signal}));
    } catch (requestError) {
      const message = adminErrorMessage(requestError, 'Không thể tải chi tiết đơn hàng.');
      if (message) setError(message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [id]);

  const history = useMemo(() => [...(order?.statusHistory || [])].sort(
    (left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)
  ), [order]);

  async function changeStatus(event) {
    event.preventDefault();
    if (!status) return;
    if (status === 'CANCELLED' && !note.trim()) {
      setError('Hãy nhập lý do hủy đơn.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateAdminOrderStatus(id, {status, note: note.trim() || undefined});
      setStatus('');
      setNote('');
      setNotice('Đã cập nhật trạng thái đơn hàng.');
      await load();
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Không thể cập nhật trạng thái đơn hàng.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !order) return <AdminLoading label="Đang tải chi tiết đơn hàng"/>;
  if (!order) return <Alert severity="error">{error || 'Không tìm thấy đơn hàng.'}</Alert>;

  const address = order.shippingAddress || {};
  const availableStatuses = nextStatuses[order.status] || [];

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={order.orderNumber}
        description={`Đặt lúc ${formatAdminDate(order.createdAt)}`}
        action={<Button component={Link} to="/admin/orders" color="inherit">← Danh sách đơn</Button>}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {order.cancellationReason && <Alert severity="error">Lý do hủy: {order.cancellationReason}</Alert>}

      <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} flexWrap="wrap" useFlexGap>
        <Chip color={orderStatusColors[order.status] || 'default'} label={orderStatusLabels[order.status] || order.status}/>
        <Chip variant="outlined" label={`Saga: ${order.workflowStatus || '—'}`}/>
        <Chip variant="outlined" label={paymentStatusLabels[order.payment?.status] || order.payment?.status || '—'}/>
      </Stack>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)'}, gap: 3, alignItems: 'start'}}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
            <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Sản phẩm</Typography>
            <Stack divider={<Divider flexItem/>} spacing={2}>
              {(order.items || []).map(item => (
                <Stack key={item.variantId || item.sku} direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems={{sm: 'center'}}>
                  {item.imageUrl && <Box component="img" src={item.imageUrl} alt={item.productName} sx={{width: 76, height: 76, objectFit: 'contain', bgcolor: 'background.default', borderRadius: 1}}/>}
                  <Box flexGrow={1}>
                    <Typography fontWeight={800}>{item.productName}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.variantName} · {item.sku}</Typography>
                    <Typography variant="body2">{item.quantity} × {formatAdminMoney(item.unitPrice)}</Typography>
                    <Typography variant="caption" color="text.secondary">Giá vốn: {formatAdminMoney(item.unitCost)}</Typography>
                  </Box>
                  <Typography fontWeight={850}>{formatAdminMoney(item.lineTotal)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'}, gap: 3}}>
            <Paper variant="outlined" sx={{p: 3}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={1.5}>Khách hàng</Typography>
              <Typography fontWeight={750}>{order.customer?.fullName}</Typography>
              <Typography>{order.customer?.email}</Typography>
              <Typography>{order.customer?.phone}</Typography>
              <Divider sx={{my: 1.5}}/>
              <Typography fontWeight={750}>{address.recipientName}</Typography>
              <Typography>{address.phone}</Typography>
              <Typography>{[address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(', ')}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{p: 3}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={1.5}>Thanh toán</Typography>
              <Typography>{paymentMethodLabels[order.payment?.method] || order.payment?.method}</Typography>
              <Typography variant="body2" color="text.secondary">Trạng thái: {paymentStatusLabels[order.payment?.status] || order.payment?.status}</Typography>
              {order.payment?.transactionId && <Typography variant="caption" color="text.secondary">Mã giao dịch: {order.payment.transactionId}</Typography>}
              {order.coupon && <Alert severity="info" sx={{mt: 2}}>Coupon {order.coupon.code}: giảm {formatAdminMoney(order.coupon.discountAmount)}</Alert>}
              {order.loyalty?.pointsUsed > 0 && <Typography variant="body2" sx={{mt: 1}}>Đã đổi {order.loyalty.pointsUsed} điểm.</Typography>}
              <Typography variant="body2">Điểm nhận được: {order.loyalty?.pointsEarned || 0}</Typography>
            </Paper>
          </Box>

          <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
            <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Lịch sử trạng thái</Typography>
            <Stack spacing={2}>
              {history.map((entry, index) => (
                <Box key={`${entry.status}-${entry.updatedAt}-${index}`} sx={{pl: 2, borderLeft: '3px solid', borderColor: orderStatusColors[entry.status] === 'error' ? 'error.main' : 'primary.main'}}>
                  <Typography fontWeight={800}>{orderStatusLabels[entry.status] || entry.status}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatAdminDate(entry.updatedAt)}</Typography>
                  {entry.note && <Typography variant="body2">{entry.note}</Typography>}
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={3} sx={{position: {lg: 'sticky'}, top: {lg: 96}}}>
          <Paper variant="outlined" sx={{p: 3}}>
            <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Giá trị đơn hàng</Typography>
            <Stack spacing={1}>
              <MoneyRow label="Tạm tính" value={order.pricing?.subtotal}/>
              <MoneyRow label="Giảm coupon" value={order.pricing?.discountAmount} negative/>
              <MoneyRow label="Giảm từ điểm" value={order.pricing?.pointsDiscount} negative/>
              <MoneyRow label="Phí giao hàng" value={order.pricing?.shippingFee}/>
              <Divider/>
              <MoneyRow label="Tổng thanh toán" value={order.pricing?.total} strong/>
              <Divider/>
              <MoneyRow label="Tổng giá vốn" value={order.pricing?.totalCost}/>
              <MoneyRow label="Lợi nhuận" value={order.pricing?.profit} strong/>
            </Stack>
          </Paper>

          <Paper component="form" onSubmit={changeStatus} variant="outlined" sx={{p: 3}}>
            <Typography component="h2" variant="h6" fontWeight={850}>Cập nhật trạng thái</Typography>
            {availableStatuses.length === 0 ? (
              <Alert severity="info" sx={{mt: 2}}>Đơn hàng đã ở trạng thái cuối.</Alert>
            ) : (
              <Stack spacing={2} sx={{mt: 2}}>
                <FormControl required>
                  <InputLabel id="next-order-status">Trạng thái mới</InputLabel>
                  <Select labelId="next-order-status" label="Trạng thái mới" value={status} onChange={event => setStatus(event.target.value)}>
                    {availableStatuses.map(value => <MenuItem key={value} value={value}>{orderStatusLabels[value]}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label={status === 'CANCELLED' ? 'Lý do hủy' : 'Ghi chú (không bắt buộc)'} value={note} onChange={event => setNote(event.target.value)} required={status === 'CANCELLED'} multiline minRows={3} inputProps={{maxLength: 250}}/>
                <Button type="submit" variant="contained" color={status === 'CANCELLED' ? 'error' : 'primary'} disabled={saving || !status}>
                  {saving ? 'Đang cập nhật…' : 'Cập nhật trạng thái'}
                </Button>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}
