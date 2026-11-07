import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Rating,
  Stack,
  Typography
} from '@mui/material';
import {Link, useParams} from 'react-router-dom';

import {
  catalogErrorMessage,
  fetchProductBySlug
} from '../../features/products/catalogApi.js';
import {
  fallbackProductImage,
  formatVnd,
  handleImageError
} from '../../features/products/productFormat.js';
import {cartErrorMessage} from '../../features/cart/cartApi.js';
import {useCart} from '../../features/cart/CartContext.jsx';
import ProductFeedback from '../../features/feedback/ProductFeedback.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

export default function ProductDetailPage() {
  const {t} = useLanguage();
  const {slug} = useParams();
  const {add} = useCart();
  const [product, setProduct] = useState(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const [cartError, setCartError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchProductBySlug(slug, {signal: controller.signal})
      .then(item => {
        setProduct(item);
        setSelectedSku(item?.variants?.[0]?.sku || '');
        setSelectedImage(0);
        setQuantity(1);
      })
      .catch(errorValue => {
        const message = catalogErrorMessage(errorValue, t('detail.loadError'));
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug, t]);

  const selectedVariant = useMemo(
    () => product?.variants?.find(variant => variant.sku === selectedSku),
    [product, selectedSku]
  );

  useEffect(() => {
    setQuantity(1);
  }, [selectedSku]);

  async function addToCart() {
    if (!product || !selectedVariant) return;

    try {
      setAdding(true);
      setCartMessage('');
      setCartError('');
      await add({
        productId: product._id,
        variantId: selectedVariant._id,
        quantity
      });
      setCartMessage(t('detail.added'));
    } catch (requestError) {
      setCartError(
        cartErrorMessage(
          requestError,
          t('detail.addError')
        )
      );
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <Box sx={{display: 'grid', minHeight: 460, placeItems: 'center'}}><CircularProgress/></Box>;
  }

  if (error || !product) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error || t('detail.notFound')}</Alert>
        <Button component={Link} to="/products" sx={{alignSelf: 'flex-start'}}>{t('detail.backCatalog')}</Button>
      </Stack>
    );
  }

  const images = product.images?.length
    ? product.images
    : [{url: fallbackProductImage, alt: product.name}];
  const category = product.categoryId;

  function changeImage(direction) {
    setSelectedImage(current =>
      (current + direction + images.length) % images.length
    );
  }

  function changeQuantity(amount) {
    const maximum = selectedVariant?.availableStock || 1;
    setQuantity(current => Math.min(maximum, Math.max(1, current + amount)));
  }

  return (
    <Stack spacing={4}>
      <Breadcrumbs aria-label={t('detail.breadcrumb')}>
        <Link to="/" style={{color: 'inherit'}}>{t('nav.home')}</Link>
        <Link to="/products" style={{color: 'inherit'}}>{t('nav.products')}</Link>
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)'}, gap: {xs: 4, md: 6}}}>
        <Stack spacing={1.5}>
          <Paper
            variant="outlined"
            sx={{
              position: 'relative', overflow: 'hidden', bgcolor: '#f8f8f5',
              '& .gallery-arrow': {opacity: 0, transform: 'translateX(0) scale(.92)'},
              '&:hover .gallery-arrow, &:focus-within .gallery-arrow': {opacity: 1, transform: 'translateX(0) scale(1)'}
            }}
          >
            <Box
              key={images[selectedImage]?.publicId || images[selectedImage]?.url}
              component="img"
              src={images[selectedImage]?.url}
              alt={images[selectedImage]?.alt || product.name}
              onError={handleImageError}
              sx={{
                display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', p: {xs: 2, sm: 4},
                animation: 'product-image-in 420ms cubic-bezier(.2,.7,.2,1) both',
                '@keyframes product-image-in': {
                  from: {opacity: 0, transform: 'scale(.975)'},
                  to: {opacity: 1, transform: 'scale(1)'}
                },
                '@media (prefers-reduced-motion: reduce)': {animation: 'none'}
              }}
            />
            {images.length > 1 && (
              <>
                <IconButton
                  className="gallery-arrow"
                  onClick={() => changeImage(-1)}
                  aria-label={t('detail.previousImage')}
                  sx={{position: 'absolute', left: 14, top: '50%', mt: -2.5, width: 42, height: 42, bgcolor: 'rgba(255,255,255,.94)', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 24px rgba(0,0,0,.13)', transition: 'opacity 180ms ease, transform 180ms ease, background-color 180ms ease', '&:hover': {bgcolor: '#fff'}}}
                >
                  <UiIcon name="arrowLeft"/>
                </IconButton>
                <IconButton
                  className="gallery-arrow"
                  onClick={() => changeImage(1)}
                  aria-label={t('detail.nextImage')}
                  sx={{position: 'absolute', right: 14, top: '50%', mt: -2.5, width: 42, height: 42, bgcolor: 'rgba(255,255,255,.94)', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 24px rgba(0,0,0,.13)', transition: 'opacity 180ms ease, transform 180ms ease, background-color 180ms ease', '&:hover': {bgcolor: '#fff'}}}
                >
                  <UiIcon name="arrowRight"/>
                </IconButton>
              </>
            )}
          </Paper>
          <Box sx={{display: 'flex', justifyContent: 'center', gap: 1, overflowX: 'auto', py: 0.5, scrollbarWidth: 'thin'}}>
            {images.map((image, index) => (
              <Paper
                key={image.publicId || image.url}
                component="button"
                type="button"
                aria-label={t('detail.viewImage',{number:index + 1})}
                onClick={() => setSelectedImage(index)}
                variant="outlined"
                sx={{flex: '0 0 76px', width: 76, cursor: 'pointer', borderWidth: index === selectedImage ? 2 : 1, borderColor: index === selectedImage ? 'secondary.main' : 'divider', overflow: 'hidden', p: 0.5, opacity: index === selectedImage ? 1 : 0.72, boxShadow: index === selectedImage ? '0 5px 15px rgba(0,0,0,.1)' : 'none', transition: 'opacity 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease', '&:hover': {opacity: 1, transform: 'translateY(-2px)'}}}
              >
                <Box component="img" src={image.url} alt={image.alt || product.name} onError={handleImageError} sx={{display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain'}}/>
              </Paper>
            ))}
          </Box>
        </Stack>

        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {category?.name && (
              <Chip component={Link} clickable to={`/products?category=${category.slug}`} label={category.name} variant="outlined"/>
            )}
            <Chip label={product.brand}/>
          </Stack>
          <Typography component="h1" variant="h3" fontWeight={850}>{product.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Rating value={product.averageRating || 0} precision={0.5} readOnly/>
            <Typography color="text.secondary">{t('detail.reviews',{count:product.ratingCount || 0})}</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{fontSize: '1.05rem'}}>{product.shortDescription}</Typography>
          <Divider/>
          <Typography component="p" variant="h4" color="primary.main" fontWeight={850}>
            {formatVnd(selectedVariant?.price || product.minPrice)}
          </Typography>

          <Box>
            <Typography component="h2" variant="subtitle1" fontWeight={800} sx={{mb: 1.25}}>{t('detail.selectVariant')}</Typography>
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
              {product.variants.map(variant => (
                <Button
                  key={variant.sku}
                  variant={variant.sku === selectedSku ? 'contained' : 'outlined'}
                  onClick={() => setSelectedSku(variant.sku)}
                  sx={{textTransform: 'none'}}
                >
                  {variant.name}
                </Button>
              ))}
            </Stack>
          </Box>

          {selectedVariant && (
            <Paper variant="outlined" sx={{p: 2.5}}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography color="text.secondary">SKU</Typography>
                  <Typography fontWeight={700}>{selectedVariant.sku}</Typography>
                </Stack>
                {Object.entries(selectedVariant.attributes || {}).map(([key, value]) => (
                  <Stack key={key} direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary" sx={{textTransform: 'capitalize'}}>{key}</Typography>
                    <Typography fontWeight={650} textAlign="right">{value}</Typography>
                  </Stack>
                ))}
                <Divider/>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography color="text.secondary">{t('detail.condition')}</Typography>
                  <Typography color={selectedVariant.availableStock > 0 ? 'success.main' : 'error.main'} fontWeight={800}>
                    {selectedVariant.availableStock > 0 ? t('catalog.stockShort',{count:selectedVariant.availableStock}) : t('catalog.outOfStock')}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          )}
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Typography fontWeight={800}>{t('detail.quantity')}</Typography>
            <Stack
              direction="row"
              alignItems="stretch"
              sx={{border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper'}}
            >
              <IconButton
                onClick={() => changeQuantity(-1)}
                disabled={adding || quantity <= 1}
                aria-label={t('cart.decrease')}
                sx={{width: 42, height: 42, borderRadius: 0}}
              >
                <Typography component="span" fontWeight={850}>−</Typography>
              </IconButton>
              <Typography
                component="span"
                aria-live="polite"
                sx={{display: 'grid', placeItems: 'center', minWidth: 48, borderLeft: '1px solid', borderRight: '1px solid', borderColor: 'divider', fontWeight: 850}}
              >
                {quantity}
              </Typography>
              <IconButton
                onClick={() => changeQuantity(1)}
                disabled={adding || !selectedVariant || quantity >= selectedVariant.availableStock}
                aria-label={t('cart.increase')}
                sx={{width: 42, height: 42, borderRadius: 0}}
              >
                <Typography component="span" fontWeight={850}>+</Typography>
              </IconButton>
            </Stack>
          </Stack>
          {cartMessage && <Alert severity="success">{cartMessage}</Alert>}
          {cartError && <Alert severity="error">{cartError}</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={adding || !selectedVariant || selectedVariant.availableStock < 1}
            onClick={addToCart}
          >
            {adding ? t('detail.adding') : t('detail.addCart')}
          </Button>
        </Stack>
      </Box>

      <Paper component="section" variant="outlined" sx={{p: {xs: 2.5, md: 4}}}>
        <Typography component="h2" variant="h5" fontWeight={850} sx={{mb: 2}}>{t('detail.description')}</Typography>
        <Typography color="text.secondary" sx={{whiteSpace: 'pre-line', lineHeight: 1.8}}>{product.description}</Typography>
        {product.tags?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mt: 3}}>
            {product.tags.map(tag => <Chip key={tag} label={`#${tag}`} size="small" variant="outlined"/>)}
          </Stack>
        )}
      </Paper>

      <ProductFeedback
        productId={product._id}
        onRatingChange={summary => setProduct(current => ({
          ...current,
          averageRating: summary.averageRating,
          ratingCount: summary.ratingCount
        }))}
      />
    </Stack>
  );
}
