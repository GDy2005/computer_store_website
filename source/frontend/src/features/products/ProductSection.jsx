import {Box, Button, Stack, Typography} from '@mui/material';
import {Link} from 'react-router-dom';

import ProductCard from './ProductCard.jsx';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

export default function ProductSection({
  title,
  description,
  products,
  actionTo = '/products'
}) {
  const {t} = useLanguage();
  if (!products?.length) return null;

  return (
    <Box component="section" aria-label={title}>
      <Stack
        direction={{xs: 'column', sm: 'row'}}
        spacing={2}
        alignItems={{sm: 'flex-end'}}
        justifyContent="space-between"
        sx={{mb: 3}}
      >
        <Stack spacing={0.75}>
          <Typography component="h2" variant="h4" fontWeight={850}>{title}</Typography>
          {description && <Typography color="text.secondary">{description}</Typography>}
        </Stack>
        <Button component={Link} to={actionTo} endIcon={<UiIcon name="arrowRight"/>} sx={{alignSelf: {xs: 'flex-start', sm: 'auto'}}}>
          {t('common.viewAll')}
        </Button>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))'},
          gap: 2.5
        }}
      >
        {products.map(product => <ProductCard key={product._id} product={product}/>)}
      </Box>
    </Box>
  );
}
