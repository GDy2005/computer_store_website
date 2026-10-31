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
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

const terminalStates = new Set(['CONFIRMED', 'REJECTED']);

export default function OrderProcessingPage() {
  const {t} = useLanguage();
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
            t('processing.readError')
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
  }, [orderNumber, refresh, t]);

  const confirmed = order?.workflowStatus === 'CONFIRMED';
  const rejected = order?.workflowStatus === 'REJECTED';

  return (
    <Paper variant="outlined" sx={{maxWidth: 700, mx: 'auto', p: {xs: 3, md: 6}}}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        {!order && !error && <CircularProgress aria-label={t('processing.checking')}/>}

        <Box>
          <Typography component="p" variant="overline" color="secondary.main" fontWeight={850}>
            {orderNumber}
          </Typography>
          <Typography component="h1" variant="h4" fontWeight={900}>
            {confirmed
              ? t('processing.success')
              : rejected
                ? t('processing.rejected')
                : t('processing.inProgress')}
          </Typography>
        </Box>

        {!confirmed && !rejected && (
          <Alert severity="info" sx={{width: '100%'}}>
            {t('processing.wait')}
          </Alert>
        )}

        {confirmed && (
          <Alert severity="success" sx={{width: '100%'}}>
            {t('processing.confirmed')}
          </Alert>
        )}

        {rejected && (
          <Alert severity="error" sx={{width: '100%'}}>
            {order.cancellationReason || t('processing.stockRejected')}
          </Alert>
        )}

        {error && <Alert severity="warning" sx={{width: '100%'}}>{error}</Alert>}

        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
          <Button component={Link} to="/products" variant="contained">
            {t('cart.continue')}
          </Button>
          <Button component={Link} to="/" variant="outlined">
            {t('processing.home')}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
