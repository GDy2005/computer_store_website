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

export default function ProductDetailPage() {
  const {slug} = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        const message = catalogErrorMessage(errorValue, 'Không tải được chi tiết sản phẩm.');
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const selectedVariant = useMemo(
    () => product?.variants?.find(variant => variant.sku === selectedSku),
    [product, selectedSku]
  );

  if (loading) {
    return <Box sx={{display: 'grid', minHeight: 460, placeItems: 'center'}}><CircularProgress/></Box>;
  }

  if (error || !product) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error || 'Không tìm thấy sản phẩm.'}</Alert>
        <Button component={Link} to="/products" sx={{alignSelf: 'flex-start'}}>Quay lại catalog</Button>
      </Stack>
    );
  }

  const images = product.images?.length
    ? product.images
    : [{url: fallbackProductImage, alt: product.name}];
  const category = product.categoryId;

  return (
    <Stack spacing={4}>
      <Breadcrumbs aria-label="Điều hướng sản phẩm">
        <Link to="/" style={{color: 'inherit'}}>Trang chủ</Link>
        <Link to="/products" style={{color: 'inherit'}}>Sản phẩm</Link>
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
                aria-label={`Xem ảnh ${index + 1}`}
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
            <Typography color="text.secondary">{product.ratingCount || 0} đánh giá</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{fontSize: '1.05rem'}}>{product.shortDescription}</Typography>
          <Divider/>
          <Typography component="p" variant="h4" color="primary.main" fontWeight={850}>
            {formatVnd(selectedVariant?.price || product.minPrice)}
          </Typography>

          <Box>
            <Typography component="h2" variant="subtitle1" fontWeight={800} sx={{mb: 1.25}}>Chọn phiên bản</Typography>
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
                  <Typography color="text.secondary">Tình trạng</Typography>
                  <Typography color={selectedVariant.availableStock > 0 ? 'success.main' : 'error.main'} fontWeight={800}>
                    {selectedVariant.availableStock > 0 ? `Còn ${selectedVariant.availableStock}` : 'Tạm hết hàng'}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          )}
          <Alert severity="info">Chức năng thêm vào giỏ hàng sẽ được triển khai trong Phase 4.</Alert>
        </Stack>
      </Box>

      <Paper component="section" variant="outlined" sx={{p: {xs: 2.5, md: 4}}}>
        <Typography component="h2" variant="h5" fontWeight={850} sx={{mb: 2}}>Mô tả sản phẩm</Typography>
        <Typography color="text.secondary" sx={{whiteSpace: 'pre-line', lineHeight: 1.8}}>{product.description}</Typography>
        {product.tags?.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{mt: 3}}>
            {product.tags.map(tag => <Chip key={tag} label={`#${tag}`} size="small" variant="outlined"/>)}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
