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
import UiIcon from '../../components/UiIcon.jsx';

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
        bgcolor: 'rgba(255,255,255,.92)',
        transition: 'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
        '&:hover': {
          transform: 'translateY(-7px)',
          boxShadow: '0 22px 46px rgba(23,63,53,0.14)',
          borderColor: 'rgba(18,76,61,.2)'
        },
        '&:hover .product-image': {transform: 'scale(1.055)'}
      }}
    >
      <CardActionArea
        component={Link}
        to={`/products/${product.slug}`}
        sx={{display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'stretch'}}
      >
        <Box sx={{position:'relative',width:'100%',aspectRatio:'1 / 1',overflow:'hidden',bgcolor:'#f2f4ef'}}>
          <Box
            className="product-image"
            component="img"
            src={productImage(product)}
            alt={product.images?.[0]?.alt || product.name}
            onError={handleImageError}
            loading="lazy"
            sx={{width:'100%',height:'100%',objectFit:'contain',p:2.5,transition:'transform 350ms cubic-bezier(.2,.75,.3,1)'}}
          />
          <Chip label={stock > 0 ? t('catalog.stockShort',{count:stock}) : t('catalog.outOfStock')} size="small" color={stock > 0 ? 'primary' : 'error'} sx={{position:'absolute',top:12,right:12,fontWeight:800}}/>
        </Box>
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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color={stock > 0 ? 'success.main' : 'error.main'} fontWeight={750}>
              {stock > 0 ? t('catalog.stock',{count:stock}) : t('catalog.outOfStock')}
            </Typography>
            <UiIcon name="arrowRight" color="primary" sx={{fontSize:20}}/>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
