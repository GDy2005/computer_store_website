import {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {Link, useNavigate} from 'react-router-dom';

import {useAuth} from '../../features/auth/AuthContext.jsx';
import {
  cartErrorMessage,
  placeOrder,
  previewCheckout,
  validateCoupon
} from '../../features/cart/cartApi.js';
import {useCart} from '../../features/cart/CartContext.jsx';
import {formatVnd} from '../../features/products/productFormat.js';
import {fetchLoyalty} from '../../features/loyalty/loyaltyApi.js';

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  addressLine: '',
  ward: '',
  district: '',
  province: '',
  paymentMethod: 'COD'
};

const addressFields = [
  ['addressLine', 'Số nhà, tên đường'],
  ['ward', 'Phường / xã'],
  ['district', 'Quận / huyện'],
  ['province', 'Tỉnh / thành phố']
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {user} = useAuth();
  const {cart, loading: cartLoading} = useCart();
  const checkoutId = useRef(crypto.randomUUID());
  const [form, setForm] = useState(emptyForm);
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    const defaultAddress =
      user.addresses?.find(address => address.isDefault) ||
      user.addresses?.[0];

    setForm(current => ({
      ...current,
      fullName: current.fullName || user.fullName || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || defaultAddress?.phone || '',
      addressLine: current.addressLine || defaultAddress?.addressLine || '',
      ward: current.ward || defaultAddress?.ward || '',
      district: current.district || defaultAddress?.district || '',
      province: current.province || defaultAddress?.province || ''
    }));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPointsBalance(0);
      setPointsToRedeem(0);
      return undefined;
    }
    const controller = new AbortController();
    fetchLoyalty(1, {signal: controller.signal})
      .then(result => setPointsBalance(result.pointsBalance))
      .catch(() => setPointsBalance(0));
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    if (cartLoading || cart.items.length === 0) {
      setLoadingPreview(false);
      return;
    }

    let active = true;
    setLoadingPreview(true);
    setPreview(null);
    setError('');

    previewCheckout(couponCode, pointsToRedeem)
      .then(result => {
        if (active) setPreview(result);
      })
      .catch(requestError => {
        if (active) {
          setError(
            cartErrorMessage(
              requestError,
              'Không thể tính đơn hàng.'
            )
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [cartLoading, cart.items.length, couponCode, pointsToRedeem]);

  function change(field) {
    return event => {
      setForm(current => ({
        ...current,
        [field]: event.target.value
      }));
    };
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setCouponCode('');
      setCouponMessage('Đã bỏ mã giảm giá.');
      return;
    }

    try {
      setError('');
      const result = await validateCoupon(code);
      setCouponCode(result.code);
      setCouponInput(result.code);
      setCouponMessage(
        `Mã hợp lệ, giảm ${formatVnd(result.discountAmount)}.`
      );
    } catch (requestError) {
      setCouponMessage('');
      setError(
        cartErrorMessage(
          requestError,
          'Mã giảm giá không hợp lệ.'
        )
      );
    }
  }

  async function submit(event) {
    event.preventDefault();

    try {
      setError('');
      setPlacing(true);

      const result = await placeOrder({
        checkoutId: checkoutId.current,
        couponCode: couponCode || null,
        paymentMethod: form.paymentMethod,
        pointsToRedeem,
        customer: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone
        },
        shippingAddress: {
          recipientName: form.fullName,
          phone: form.phone,
          addressLine: form.addressLine,
          ward: form.ward,
          district: form.district,
          province: form.province
        }
      });

      navigate(`/checkout/${result.orderNumber}`, {
        replace: true
      });
    } catch (requestError) {
      setError(
        cartErrorMessage(
          requestError,
          'Không thể tạo đơn hàng.'
        )
      );
    } finally {
      setPlacing(false);
    }
  }

  if (cartLoading) {
    return (
      <Box sx={{display: 'grid', minHeight: 360, placeItems: 'center'}}>
        <CircularProgress aria-label="Đang tải checkout"/>
      </Box>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Alert
        severity="info"
        action={<Button component={Link} to="/products">Xem sản phẩm</Button>}
      >
        Giỏ hàng đang trống nên chưa thể thanh toán.
      </Alert>
    );
  }

  return (
    <Stack component="form" spacing={3} onSubmit={submit}>
      <Box>
        <Typography component="h1" variant="h4" fontWeight={850}>
          Thanh toán
        </Typography>
        <Typography color="text.secondary">
          Giá và tồn kho sẽ được backend kiểm tra lại trước khi tạo đơn.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 1fr) 360px'},
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{p: {xs: 2.5, sm: 3.5}}}>
            <Stack spacing={2}>
              <Typography component="h2" variant="h6" fontWeight={850}>
                Người nhận hàng
              </Typography>
              <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr'}, gap: 2}}>
                <TextField
                  label="Họ và tên"
                  required
                  value={form.fullName}
                  onChange={change('fullName')}
                />
                <TextField
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={change('email')}
                />
                <TextField
                  label="Số điện thoại"
                  required
                  value={form.phone}
                  onChange={change('phone')}
                />
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{p: {xs: 2.5, sm: 3.5}}}>
            <Stack spacing={2}>
              <Typography component="h2" variant="h6" fontWeight={850}>
                Địa chỉ giao hàng
              </Typography>
              <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr'}, gap: 2}}>
                {addressFields.map(([field, label], index) => (
                  <TextField
                    key={field}
                    label={label}
                    required
                    value={form[field]}
                    onChange={change(field)}
                    sx={index === 0 ? {gridColumn: {sm: '1 / -1'}} : undefined}
                  />
                ))}
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{p: {xs: 2.5, sm: 3.5}}}>
            <Stack spacing={2}>
              <Typography component="h2" variant="h6" fontWeight={850}>
                Thanh toán
              </Typography>
              <TextField
                select
                label="Phương thức"
                value={form.paymentMethod}
                onChange={change('paymentMethod')}
              >
                <MenuItem value="COD">Thanh toán khi nhận hàng</MenuItem>
                <MenuItem value="SIMULATED_ONLINE">Thanh toán online mô phỏng</MenuItem>
              </TextField>
            </Stack>
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{p: 3, position: {md: 'sticky'}, top: {md: 96}}}>
          <Stack spacing={2}>
            <Typography component="h2" variant="h6" fontWeight={850}>
              Đơn hàng
            </Typography>

            {cart.items.map(item => (
              <Stack key={item.variantId} direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2">
                  {item.productName} × {item.quantity}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formatVnd(item.lineTotal)}
                </Typography>
              </Stack>
            ))}

            <Divider/>

            <Stack direction="row" spacing={1}>
              <TextField
                label="Mã giảm giá"
                size="small"
                value={couponInput}
                onChange={event => setCouponInput(event.target.value.toUpperCase())}
                inputProps={{maxLength: 50}}
              />
              <Button type="button" variant="outlined" onClick={applyCoupon}>
                Áp dụng
              </Button>
            </Stack>

            {couponMessage && <Alert severity="success">{couponMessage}</Alert>}

            {user && (
              <TextField
                label={`Dùng điểm (đang có ${pointsBalance})`}
                type="number"
                size="small"
                value={pointsToRedeem}
                onChange={event => {
                  const value = Number(event.target.value);
                  setPointsToRedeem(Number.isInteger(value) && value >= 0 ? value : 0);
                }}
                inputProps={{min: 0, max: Math.min(pointsBalance, preview?.loyalty?.maximumPoints ?? pointsBalance), step: 1}}
                helperText="1 điểm tương đương 1.000 ₫"
              />
            )}

            {loadingPreview && <CircularProgress size={24}/>} 

            {preview && !loadingPreview && (
              <>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Tạm tính</Typography>
                  <Typography>{formatVnd(preview.pricing.subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Giảm giá</Typography>
                  <Typography color="success.main">
                    −{formatVnd(preview.pricing.discountAmount)}
                  </Typography>
                </Stack>
                {preview.pricing.pointsDiscount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Đổi điểm</Typography>
                    <Typography color="success.main">
                      −{formatVnd(preview.pricing.pointsDiscount)}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Phí giao hàng</Typography>
                  <Typography>{formatVnd(preview.pricing.shippingFee)}</Typography>
                </Stack>
                <Divider/>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={850}>Tổng cộng</Typography>
                  <Typography color="primary.main" fontWeight={900}>
                    {formatVnd(preview.pricing.total)}
                  </Typography>
                </Stack>
              </>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={placing || loadingPreview || !preview}
            >
              {placing ? 'Đang tạo đơn...' : 'Đặt hàng'}
            </Button>
            <Button component={Link} to="/cart">
              Quay lại giỏ hàng
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
