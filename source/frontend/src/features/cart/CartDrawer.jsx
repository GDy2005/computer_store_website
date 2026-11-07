import {useEffect, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import {Link} from 'react-router-dom';

import UiIcon from '../../components/UiIcon.jsx';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import {
  fallbackProductImage,
  formatVnd,
  handleImageError
} from '../products/productFormat.js';
import {cartErrorMessage} from './cartApi.js';
import {useCart} from './CartContext.jsx';

export default function CartDrawer() {
  const {t} = useLanguage();
  const {
    cart,
    loading,
    error: loadError,
    drawerOpen,
    closeCart,
    update,
    remove,
    clear
  } = useCart();
  const [busyVariant, setBusyVariant] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!drawerOpen) {
      setActionError('');
      setBusyVariant('');
    }
  }, [drawerOpen]);

  async function changeQuantity(item, amount) {
    const quantity = item.quantity + amount;

    if (quantity < 1 || quantity > item.availableStock) return;

    try {
      setActionError('');
      setBusyVariant(item.variantId);
      await update(item.variantId, quantity);
    } catch (requestError) {
      setActionError(cartErrorMessage(requestError, t('cart.updateError')));
    } finally {
      setBusyVariant('');
    }
  }

  async function removeItem(variantId) {
    try {
      setActionError('');
      setBusyVariant(variantId);
      await remove(variantId);
    } catch (requestError) {
      setActionError(cartErrorMessage(requestError, t('cart.removeError')));
    } finally {
      setBusyVariant('');
    }
  }

  async function removeAll() {
    try {
      setActionError('');
      await clear();
    } catch (requestError) {
      setActionError(cartErrorMessage(requestError, t('cart.clearError')));
    }
  }

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={closeCart}
      ModalProps={{keepMounted: true}}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(10, 14, 13, 0.56)',
            backdropFilter: 'blur(2px)'
          }
        },
        paper: {
          sx: {
            width: {xs: '100%', sm: 470, md: 510},
            maxWidth: '100%',
            bgcolor: '#fff',
            backgroundImage: 'none',
            overflow: 'hidden'
          }
        }
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        sx={{
          display: 'flex',
          height: '100%',
          minHeight: 0,
          flexDirection: 'column',
          '@keyframes cartItemIn': {
            from: {opacity: 0, transform: 'translateX(18px)'},
            to: {opacity: 1, transform: 'translateX(0)'}
          }
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{px: {xs: 2, sm: 3}, py: 2.25, borderBottom: '1px solid', borderColor: 'divider'}}
        >
          <Box>
            <Typography id="cart-drawer-title" component="h2" variant="h6" fontWeight={900}>
              {t('cart.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('cart.selected', {count: cart.totalItems})}
            </Typography>
          </Box>
          <IconButton onClick={closeCart} aria-label={t('cart.close')} sx={{border: '1px solid', borderColor: 'divider'}}>
            <UiIcon name="close"/>
          </IconButton>
        </Stack>

        <Box sx={{width: 48, height: 3, ml: {xs: 2, sm: 3}, bgcolor: 'secondary.main'}}/>

        <Box sx={{flex: 1, minHeight: 0, overflowY: 'auto', px: {xs: 2, sm: 3}, py: 2.5}}>
          {(loadError || actionError) && (
            <Alert severity="error" sx={{mb: 2}}>{actionError || loadError}</Alert>
          )}

          {loading ? (
            <Box sx={{display: 'grid', minHeight: 260, placeItems: 'center'}}>
              <CircularProgress aria-label={t('cart.loading')}/>
            </Box>
          ) : cart.items.length === 0 ? (
            <Stack spacing={2} alignItems="center" justifyContent="center" sx={{minHeight: 340, textAlign: 'center'}}>
              <Box
                sx={{
                  display: 'grid',
                  width: 72,
                  height: 72,
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  color: 'primary.main'
                }}
              >
                <UiIcon name="cart" sx={{fontSize: 34}}/>
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={850}>{t('cart.emptyTitle')}</Typography>
                <Typography color="text.secondary" sx={{mt: 0.5}}>{t('cart.emptyText')}</Typography>
              </Box>
              <Button component={Link} to="/products" variant="contained" onClick={closeCart}>
                {t('common.viewProduct')}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={0} divider={<Divider flexItem/>}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{pb: 1.5}}>
                <Typography variant="overline" color="text.secondary" fontWeight={800}>
                  {t('cart.items')}
                </Typography>
                <Button size="small" color="error" onClick={removeAll}>{t('cart.clearAll')}</Button>
              </Stack>

              {cart.items.map((item, index) => {
                const busy = busyVariant === item.variantId;

                return (
                  <Box
                    key={item.variantId}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '88px minmax(0, 1fr)',
                      gap: 2,
                      py: 2.25,
                      animation: 'cartItemIn 280ms ease both',
                      animationDelay: `${Math.min(index * 45, 180)}ms`
                    }}
                  >
                    <Box
                      component="img"
                      src={item.imageUrl || fallbackProductImage}
                      alt={item.productName}
                      onError={handleImageError}
                      sx={{
                        width: 88,
                        height: 88,
                        border: '1px solid',
                        borderColor: 'divider',
                        objectFit: 'contain',
                        bgcolor: '#fafafa'
                      }}
                    />

                    <Stack spacing={0.8} minWidth={0}>
                      <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                        <Typography fontWeight={850} lineHeight={1.3} sx={{overflowWrap: 'anywhere'}}>
                          {item.productName}
                        </Typography>
                        <Typography fontWeight={850} whiteSpace="nowrap">
                          {formatVnd(item.lineTotal)}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {item.variantName} · {item.sku}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatVnd(item.unitPrice)}
                      </Typography>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{pt: 0.3}}>
                        <Stack direction="row" alignItems="center" sx={{border: '1px solid', borderColor: 'divider'}}>
                          <IconButton
                            size="small"
                            disabled={busy || item.quantity <= 1}
                            onClick={() => changeQuantity(item, -1)}
                            aria-label={t('cart.decrease')}
                            sx={{borderRadius: 0}}
                          >
                            <Typography component="span" fontWeight={800}>−</Typography>
                          </IconButton>
                          <Typography
                            minWidth={38}
                            minHeight={34}
                            display="grid"
                            sx={{placeItems: 'center', borderLeft: '1px solid', borderRight: '1px solid', borderColor: 'divider'}}
                            textAlign="center"
                            fontWeight={800}
                          >
                            {busy ? <CircularProgress size={14}/> : item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            disabled={busy || item.quantity >= item.availableStock}
                            onClick={() => changeQuantity(item, 1)}
                            aria-label={t('cart.increase')}
                            sx={{borderRadius: 0}}
                          >
                            <Typography component="span" fontWeight={800}>+</Typography>
                          </IconButton>
                        </Stack>
                        <Button
                          size="small"
                          color="error"
                          disabled={busy}
                          onClick={() => removeItem(item.variantId)}
                          sx={{minWidth: 0}}
                        >
                          {t('cart.remove')}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        {!loading && cart.items.length > 0 && (
          <Box sx={{borderTop: '1px solid', borderColor: 'divider', px: {xs: 2, sm: 3}, py: 2.5, boxShadow: '0 -12px 30px rgba(15, 24, 21, 0.05)'}}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                <Typography fontWeight={800}>{t('cart.subtotal')}</Typography>
                <Typography variant="h6" fontWeight={950}>{formatVnd(cart.subtotal)}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t('cart.recalculated')}
              </Typography>
              <Stack direction={{xs: 'column-reverse', sm: 'row'}} spacing={1.25}>
                <Button fullWidth variant="outlined" onClick={closeCart}>
                  {t('cart.continue')}
                </Button>
                <Button
                  fullWidth
                  component={Link}
                  to="/checkout"
                  variant="contained"
                  onClick={closeCart}
                >
                  {t('cart.checkout')}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
