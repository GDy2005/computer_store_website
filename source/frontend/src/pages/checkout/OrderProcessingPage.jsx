import {useEffect, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import {Link, useParams} from 'react-router-dom';

import {
  cartErrorMessage,
  fetchOrderStatus
} from '../../features/cart/cartApi.js';
import {useCart} from '../../features/cart/CartContext.jsx';

const terminalStates = new Set(['CONFIRMED', 'REJECTED']);

export default function OrderProcessingPage() {
  const {orderNumber} = useParams();
  const {refresh} = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stopped = false;
    let timer;

    async function poll() {
      try {
        const result = await fetchOrderStatus(orderNumber);

        if (stopped) return;

        setOrder(result);
        setError('');

        if (terminalStates.has(result.workflowStatus)) {
          await refresh().catch(() => undefined);
          return;
        }
      } catch (requestError) {
        if (stopped) return;

        setError(
          cartErrorMessage(
            requestError,
            'Chưa thể đọc trạng thái đơn hàng.'
          )
        );
      }

      if (!stopped) timer = setTimeout(poll, 1200);
    }

    poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderNumber, refresh]);

  const confirmed = order?.workflowStatus === 'CONFIRMED';
  const rejected = order?.workflowStatus === 'REJECTED';

  return (
    <Paper variant="outlined" sx={{maxWidth: 700, mx: 'auto', p: {xs: 3, md: 6}}}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        {!order && !error && <CircularProgress aria-label="Đang kiểm tra đơn hàng"/>}

        <Box>
          <Typography component="p" variant="overline" color="secondary.main" fontWeight={850}>
            {orderNumber}
          </Typography>
          <Typography component="h1" variant="h4" fontWeight={900}>
            {confirmed
              ? 'Đặt hàng thành công'
              : rejected
                ? 'Đơn hàng không thể xác nhận'
                : 'Đang xử lý đơn hàng'}
          </Typography>
        </Box>

        {!confirmed && !rejected && (
          <Alert severity="info" sx={{width: '100%'}}>
            Hệ thống đang giữ tồn kho qua Kafka. Bạn không cần gửi lại đơn hàng.
          </Alert>
        )}

        {confirmed && (
          <Alert severity="success" sx={{width: '100%'}}>
            Tồn kho đã được xác nhận. Email xác nhận đang được Notification Service xử lý.
          </Alert>
        )}

        {rejected && (
          <Alert severity="error" sx={{width: '100%'}}>
            {order.cancellationReason || 'Sản phẩm không còn đủ tồn kho.'}
          </Alert>
        )}

        {error && <Alert severity="warning" sx={{width: '100%'}}>{error}</Alert>}

        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
          <Button component={Link} to="/products" variant="contained">
            Tiếp tục mua sắm
          </Button>
          <Button component={Link} to="/" variant="outlined">
            Về trang chủ
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
