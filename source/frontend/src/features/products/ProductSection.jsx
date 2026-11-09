import {Box} from '@mui/material';

import ProductCard from './ProductCard.jsx';
import HomeSectionPanel from '../../components/HomeSectionPanel.jsx';

export default function ProductSection({
  title,
  description,
  products,
  actionTo = '/products',
  icon = 'package'
}) {
  if (!products?.length) return null;

  return (
    <HomeSectionPanel
      title={title}
      description={description}
      actionTo={actionTo}
      icon={icon}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))'
          },
          gap: {xs: 1.15, sm: 1.6}
        }}
      >
        {products.map(product => <ProductCard key={product._id} product={product}/>)}
      </Box>
    </HomeSectionPanel>
  );
}
