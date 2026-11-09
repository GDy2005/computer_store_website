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
  orderStatusColors
} from '../../features/admin/adminFormat.js';
import {formatAddress} from '../../features/address/addressFormat.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

const nextStatuses = {
  PENDING: ['CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

function MoneyRow({label, value, locale, strong = false, negative = false}) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography fontWeight={strong ? 850 : 400}>{label}</Typography>
      <Typography fontWeight={strong ? 900 : 650}>{negative ? '−' : ''}{formatAdminMoney(value, locale)}</Typography>
    </Stack>
  );
}

export default function AdminOrderDetailPage() {
  const {locale, t} = useLanguage();
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
      const message = adminErrorMessage(requestError, t('admin.orderDetail.loadError'));
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
      setError(t('admin.orderDetail.cancelRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateAdminOrderStatus(id, {status, note: note.trim() || undefined});
      setStatus('');
      setNote('');
      setNotice(t('admin.orderDetail.updated'));
      await load();
    } catch (requestError) {
      setError(adminErrorMessage(requestError, t('admin.orderDetail.updateError')));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !order) return <AdminLoading label={t('admin.orderDetail.loading')}/>;
  if (!order) return <Alert severity="error">{error || t('admin.orderDetail.notFound')}</Alert>;

  const address = order.shippingAddress || {};
  const availableStatuses = nextStatuses[order.status] || [];

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={order.orderNumber}
        description={t('admin.orderDetail.placedAt', {date: formatAdminDate(order.createdAt, {locale})})}
        action={<Button component={Link} to="/admin/orders" color="inherit">{t('admin.orderDetail.back')}</Button>}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {order.cancellationReason && <Alert severity="error">{t('admin.orderDetail.cancelReason', {reason: order.cancellationReason})}</Alert>}

      <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} flexWrap="wrap" useFlexGap>
        <Chip color={orderStatusColors[order.status] || 'default'} label={t(`status.${order.status}`)}/>
        <Chip variant="outlined" label={`Saga: ${order.workflowStatus || '—'}`}/>
        <Chip variant="outlined" label={order.payment?.status ? t(`payment.${order.payment.status}`) : '—'}/>
      </Stack>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(300px, 0.65fr)'}, gap: 3, alignItems: 'start'}}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
            <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.orderDetail.products')}</Typography>
            <Stack divider={<Divider flexItem/>} spacing={2}>
              {(order.items || []).map(item => (
                <Stack key={item.variantId || item.sku} direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems={{sm: 'center'}}>
                  {item.imageUrl && <Box component="img" src={item.imageUrl} alt={item.productName} sx={{width: 76, height: 76, objectFit: 'contain', bgcolor: 'background.default', borderRadius: 1}}/>}
                  <Box flexGrow={1}>
                    <Typography fontWeight={800}>{item.productName}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.variantName} · {item.sku}</Typography>
                    <Typography variant="body2">{item.quantity} × {formatAdminMoney(item.unitPrice, locale)}</Typography>
                    <Typography variant="caption" color="text.secondary">{t('admin.orderDetail.unitCost', {amount: formatAdminMoney(item.unitCost, locale)})}</Typography>
                  </Box>
                  <Typography fontWeight={850}>{formatAdminMoney(item.lineTotal, locale)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'}, gap: 3}}>
            <Paper variant="outlined" sx={{p: 3}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={1.5}>{t('admin.orderDetail.customer')}</Typography>
              <Typography fontWeight={750}>{order.customer?.fullName}</Typography>
              <Typography>{order.customer?.email}</Typography>
              <Typography>{order.customer?.phone}</Typography>
              <Divider sx={{my: 1.5}}/>
              <Typography fontWeight={750}>{address.recipientName}</Typography>
              <Typography>{address.phone}</Typography>
              <Typography>{formatAddress(address, locale)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{p: 3}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={1.5}>{t('admin.orderDetail.payment')}</Typography>
              <Typography>{order.payment?.method === 'COD' ? t('checkout.cod') : order.payment?.method === 'SIMULATED_CARD' ? t('checkout.demoCard') : order.payment?.method}</Typography>
              <Typography variant="body2" color="text.secondary">{t('admin.orderDetail.paymentStatus', {status: t(`payment.${order.payment?.status}`)})}</Typography>
              {order.payment?.transactionId && <Typography variant="caption" color="text.secondary">{t('admin.orderDetail.transaction', {id: order.payment.transactionId})}</Typography>}
              {order.coupon && <Alert severity="info" sx={{mt: 2}}>{t('admin.orderDetail.coupon', {code: order.coupon.code, amount: formatAdminMoney(order.coupon.discountAmount, locale)})}</Alert>}
              {order.loyalty?.pointsUsed > 0 && <Typography variant="body2" sx={{mt: 1}}>{t('admin.orderDetail.pointsUsed', {count: order.loyalty.pointsUsed})}</Typography>}
              <Typography variant="body2">{t('admin.orderDetail.pointsEarned', {count: order.loyalty?.pointsEarned || 0})}</Typography>
            </Paper>
          </Box>

          <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
            <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.orderDetail.history')}</Typography>
            <Stack spacing={2}>
              {history.map((entry, index) => (
                <Box key={`${entry.status}-${entry.updatedAt}-${index}`} sx={{pl: 2, borderLeft: '3px solid', borderColor: orderStatusColors[entry.status] === 'error' ? 'error.main' : 'primary.main'}}>
                  <Typography fontWeight={800}>{t(`status.${entry.status}`)}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatAdminDate(entry.updatedAt, {locale})}</Typography>
                  {entry.note && <Typography variant="body2">{entry.note}</Typography>}
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={3} sx={{position: {lg: 'sticky'}, top: {lg: 96}}}>
          <Paper variant="outlined" sx={{p: 3}}>
            <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.orderDetail.value')}</Typography>
            <Stack spacing={1}>
              <MoneyRow label={t('admin.orderDetail.subtotal')} value={order.pricing?.subtotal} locale={locale}/>
              <MoneyRow label={t('admin.orderDetail.couponDiscount')} value={order.pricing?.discountAmount} locale={locale} negative/>
              <MoneyRow label={t('admin.orderDetail.pointsDiscount')} value={order.pricing?.pointsDiscount} locale={locale} negative/>
              <MoneyRow label={t('admin.orderDetail.shipping')} value={order.pricing?.shippingFee} locale={locale}/>
              <Divider/>
              <MoneyRow label={t('admin.orderDetail.paymentTotal')} value={order.pricing?.total} locale={locale} strong/>
              <Divider/>
              <MoneyRow label={t('admin.orderDetail.totalCost')} value={order.pricing?.totalCost} locale={locale}/>
              <MoneyRow label={t('admin.orderDetail.profit')} value={order.pricing?.profit} locale={locale} strong/>
            </Stack>
          </Paper>

          <Paper component="form" onSubmit={changeStatus} variant="outlined" sx={{p: 3}}>
            <Typography component="h2" variant="h6" fontWeight={850}>{t('admin.orderDetail.updateStatus')}</Typography>
            {availableStatuses.length === 0 ? (
              <Alert severity="info" sx={{mt: 2}}>{t('admin.orderDetail.finalStatus')}</Alert>
            ) : (
              <Stack spacing={2} sx={{mt: 2}}>
                <FormControl required>
                  <InputLabel id="next-order-status">{t('admin.orderDetail.newStatus')}</InputLabel>
                  <Select labelId="next-order-status" label={t('admin.orderDetail.newStatus')} value={status} onChange={event => setStatus(event.target.value)}>
                    {availableStatuses.map(value => <MenuItem key={value} value={value}>{t(`status.${value}`)}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label={status === 'CANCELLED' ? t('admin.orderDetail.cancelNote') : t('admin.orderDetail.optionalNote')} value={note} onChange={event => setNote(event.target.value)} required={status === 'CANCELLED'} multiline minRows={3} inputProps={{maxLength: 250}}/>
                <Button type="submit" variant="contained" color={status === 'CANCELLED' ? 'error' : 'primary'} disabled={saving || !status}>
                  {saving ? t('admin.orderDetail.updating') : t('admin.orderDetail.updateStatus')}
                </Button>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );
}
