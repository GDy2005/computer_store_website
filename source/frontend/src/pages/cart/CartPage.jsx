import {useState} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import {Link} from 'react-router-dom';

import {
  cartErrorMessage
} from '../../features/cart/cartApi.js';
import {
  useCart
} from '../../features/cart/CartContext.jsx';
import {
  fallbackProductImage,
  formatVnd,
  handleImageError
} from '../../features/products/productFormat.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

export default function CartPage() {
  const {t} = useLanguage();
  const {cart, loading, error: loadError, update, remove, clear} = useCart();
  const [busyVariant, setBusyVariant] = useState('');
  const [error, setError] = useState('');

  async function changeQuantity(item, amount) {
    const quantity = item.quantity + amount;

    if (quantity < 1 || quantity > item.availableStock) return;

    try {
      setError('');
      setBusyVariant(item.variantId);
      await update(item.variantId, quantity);
    } catch (requestError) {
      setError(
        cartErrorMessage(
          requestError,
          t('cart.updateError')
        )
      );
    } finally {
      setBusyVariant('');
    }
  }

  async function removeItem(variantId) {
    try {
      setError('');
      setBusyVariant(variantId);
      await remove(variantId);
    } catch (requestError) {
      setError(
        cartErrorMessage(
          requestError,
          t('cart.removeError')
        )
      );
    } finally {
      setBusyVariant('');
    }
  }

  async function removeAll() {
    try {
      setError('');
      await clear();
    } catch (requestError) {
      setError(
        cartErrorMessage(
          requestError,
          t('cart.clearError')
        )
      );
    }
  }

  if (loading) {
    return (
      <Box sx={{display: 'grid', minHeight: 360, placeItems: 'center'}}>
        <CircularProgress aria-label={t('cart.loading')}/>
      </Box>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Stack spacing={2}>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        <Paper variant="outlined" sx={{p: {xs: 3, md: 6}, textAlign: 'center'}}>
          <Stack spacing={2} alignItems="center">
          <Typography component="h1" variant="h4" fontWeight={850}>
            {t('cart.emptyTitle')}
          </Typography>
          <Typography color="text.secondary">
            {t('cart.emptyText')}
          </Typography>
          <Button component={Link} to="/products" variant="contained">
            {t('common.viewProduct')}
          </Button>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{xs: 'column', sm: 'row'}}
        justifyContent="space-between"
        alignItems={{sm: 'center'}}
        spacing={1}
      >
        <Box>
          <Typography component="h1" variant="h4" fontWeight={850}>
            {t('cart.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('cart.selected',{count:cart.totalItems})}
          </Typography>
        </Box>
        <Button color="error" onClick={removeAll}>
          {t('cart.clearAll')}
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 1fr) 330px'},
          gap: 3,
          alignItems: 'start'
        }}
      >
        <Stack spacing={2}>
          {cart.items.map(item => {
            const busy = busyVariant === item.variantId;

            return (
              <Paper key={item.variantId} variant="outlined" sx={{p: 2}}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '86px 1fr', sm: '110px 1fr auto'},
                    gap: 2,
                    alignItems: 'center'
                  }}
                >
                  <Box
                    component="img"
                    src={item.imageUrl || fallbackProductImage}
                    alt={item.productName}
                    onError={handleImageError}
                    sx={{width: '100%', aspectRatio: '1 / 1', objectFit: 'contain'}}
                  />
                  <Stack spacing={0.75}>
                    <Typography fontWeight={800}>{item.productName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.variantName} · {item.sku}
                    </Typography>
                    <Typography color="primary.main" fontWeight={800}>
                      {formatVnd(item.unitPrice)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy || item.quantity <= 1}
                        onClick={() => changeQuantity(item, -1)}
                      >
                        −
                      </Button>
                      <Typography minWidth={28} textAlign="center" fontWeight={750}>
                        {item.quantity}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy || item.quantity >= item.availableStock}
                        onClick={() => changeQuantity(item, 1)}
                      >
                        +
                      </Button>
                    </Stack>
                  </Stack>
                  <Stack
                    spacing={1}
                    alignItems={{xs: 'flex-start', sm: 'flex-end'}}
                    sx={{gridColumn: {xs: '1 / -1', sm: 'auto'}}}
                  >
                    <Typography fontWeight={850}>{formatVnd(item.lineTotal)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('catalog.stock',{count:item.availableStock})}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      disabled={busy}
                      onClick={() => removeItem(item.variantId)}
                    >
                      {t('cart.remove')}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            );
          })}
        </Stack>

        <Paper variant="outlined" sx={{p: 3, position: {md: 'sticky'}, top: {md: 96}}}>
          <Stack spacing={2}>
            <Typography component="h2" variant="h6" fontWeight={850}>
              {t('cart.summary')}
            </Typography>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">{t('cart.subtotal')}</Typography>
              <Typography fontWeight={750}>{formatVnd(cart.subtotal)}</Typography>
            </Stack>
            <Divider/>
            <Typography variant="body2" color="text.secondary">
              {t('cart.recalculated')}
            </Typography>
            <Button component={Link} to="/checkout" variant="contained" size="large">
              {t('cart.checkout')}
            </Button>
            <Button component={Link} to="/products">
              {t('cart.continue')}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
