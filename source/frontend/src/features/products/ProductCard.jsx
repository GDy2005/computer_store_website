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

import {
  availableProductStock,
  formatProductPrice,
  handleImageError,
  productImage
} from './productFormat.js';

export default function ProductCard({product}) {
  const stock = availableProductStock(product);
  const category = product.categoryId?.name;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        overflow: 'hidden',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 36px rgba(23,63,53,0.12)'
        }
      }}
    >
      <CardActionArea
        component={Link}
        to={`/products/${product.slug}`}
        sx={{display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'stretch'}}
      >
        <Box
          component="img"
          src={productImage(product)}
          alt={product.images?.[0]?.alt || product.name}
          onError={handleImageError}
          loading="lazy"
          sx={{width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', bgcolor: '#f8f8f5', p: 2}}
        />
        <CardContent sx={{display: 'flex', flexGrow: 1, flexDirection: 'column', gap: 1.25}}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="overline" color="text.secondary" sx={{lineHeight: 1.2}}>
              {product.brand}
            </Typography>
            {category && <Chip label={category} size="small" variant="outlined"/>}
          </Stack>
          <Typography component="h3" variant="h6" sx={{fontWeight: 750, lineHeight: 1.3}}>
            {product.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2
            }}
          >
            {product.shortDescription}
          </Typography>
          <Box sx={{flexGrow: 1}}/>
          <Stack direction="row" spacing={1} alignItems="center">
            <Rating value={product.averageRating || 0} precision={0.5} size="small" readOnly/>
            <Typography variant="caption" color="text.secondary">
              ({product.ratingCount || 0})
            </Typography>
          </Stack>
          <Typography color="primary.main" fontWeight={850} sx={{fontSize: '1.08rem'}}>
            {formatProductPrice(product)}
          </Typography>
          <Typography variant="caption" color={stock > 0 ? 'success.main' : 'error.main'} fontWeight={700}>
            {stock > 0 ? `Còn ${stock} sản phẩm` : 'Tạm hết hàng'}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
