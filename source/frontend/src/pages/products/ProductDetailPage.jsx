import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
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

export default function ProductDetailPage() {
  const {t} = useLanguage();
  const {slug} = useParams();
  const {add} = useCart();
  const [product, setProduct] = useState(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
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

  async function addToCart() {
    if (!product || !selectedVariant) return;

    try {
      setAdding(true);
      setCartMessage('');
      setCartError('');
      await add({
        productId: product._id,
        variantId: selectedVariant._id,
        quantity: 1
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

  return (
    <Stack spacing={4}>
      <Breadcrumbs aria-label={t('detail.breadcrumb')}>
        <Link to="/" style={{color: 'inherit'}}>{t('nav.home')}</Link>
        <Link to="/products" style={{color: 'inherit'}}>{t('nav.products')}</Link>
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)'}, gap: {xs: 4, md: 6}}}>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{overflow: 'hidden', bgcolor: '#f8f8f5'}}>
            <Box
              component="img"
              src={images[selectedImage]?.url}
              alt={images[selectedImage]?.alt || product.name}
              onError={handleImageError}
              sx={{display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', p: {xs: 2, sm: 4}}}
            />
          </Paper>
          <Box sx={{display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 5)}, minmax(0, 1fr))`, gap: 1.5}}>
            {images.map((image, index) => (
              <Paper
                key={image.publicId || image.url}
                component="button"
                type="button"
                aria-label={t('detail.viewImage',{number:index + 1})}
                onClick={() => setSelectedImage(index)}
                variant="outlined"
                sx={{cursor: 'pointer', borderWidth: index === selectedImage ? 2 : 1, borderColor: index === selectedImage ? 'primary.main' : 'divider', overflow: 'hidden', p: 0.75}}
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
