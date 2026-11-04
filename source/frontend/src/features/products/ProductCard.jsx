import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Rating,
  Stack,
  Typography
} from '@mui/material';
import {Link} from 'react-router-dom';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import {
  availableProductStock,
  formatProductPrice,
  handleImageError,
  productImage
} from './productFormat.js';

export default function ProductCard({product}) {
  const {t} = useLanguage();
  const stock = availableProductStock(product);
  const category = product.categoryId?.name;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'common.white',
        transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 14px 30px rgba(31,41,55,.12)',
          borderColor: 'rgba(246,173,50,.72)'
        },
        '&:hover .product-image': {transform: 'scale(1.04)'}
      }}
    >
      <CardActionArea
        component={Link}
        to={`/products/${product.slug}`}
        sx={{display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'stretch'}}
      >
        <Box sx={{position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', bgcolor: '#f4f5f7'}}>
          <Box
            className="product-image"
            component="img"
            src={productImage(product)}
            alt={product.images?.[0]?.alt || product.name}
            onError={handleImageError}
            loading="lazy"
            sx={{width: '100%', height: '100%', objectFit: 'contain', p: {xs: 1.25, sm: 2}, transition: 'transform 320ms cubic-bezier(.2,.75,.3,1)'}}
          />
          <Chip
            label={stock > 0 ? t('catalog.stockShort', {count: stock}) : t('catalog.outOfStock')}
            size="small"
            color={stock > 0 ? 'default' : 'error'}
            sx={{position: 'absolute', top: 9, right: 9, bgcolor: stock > 0 ? 'rgba(36,39,43,.82)' : undefined, color: stock > 0 ? 'common.white' : undefined, backdropFilter: 'blur(6px)', fontSize: 11}}
          />
        </Box>
        <CardContent sx={{display: 'flex', flexGrow: 1, flexDirection: 'column', gap: 0.8, p: {xs: 1.25, sm: 1.6}, '&:last-child': {pb: {xs: 1.4, sm: 1.8}}}}>
          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" fontWeight={750} noWrap>
              {product.brand}
            </Typography>
            {category && <Typography variant="caption" color="text.secondary" noWrap>{category}</Typography>}
          </Stack>
          <Typography
            component="h3"
            sx={{
              fontWeight: 750,
              fontSize: {xs: '0.9rem', sm: '0.98rem'},
              lineHeight: 1.4,
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              minHeight: {xs: '2.52rem', sm: '2.75rem'}
            }}
          >
            {product.name}
          </Typography>
          <Box sx={{flexGrow: 1}}/>
          <Typography color="text.primary" fontWeight={900} sx={{fontSize: {xs: '0.92rem', sm: '1rem'}}}>
            {formatProductPrice(product)}
          </Typography>
          <Stack direction="row" spacing={0.6} alignItems="center">
            <Rating value={product.averageRating || 0} precision={0.5} size="small" readOnly sx={{fontSize: {xs: 15, sm: 17}}}/>
            <Typography variant="caption" color="text.secondary">({product.ratingCount || 0})</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
