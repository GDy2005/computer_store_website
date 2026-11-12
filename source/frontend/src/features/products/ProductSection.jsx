import {useEffect, useRef, useState} from 'react';
import {Box, IconButton, Stack} from '@mui/material';

import ProductCard from './ProductCard.jsx';
import HomeSectionPanel from '../../components/HomeSectionPanel.jsx';
import UiIcon from '../../components/UiIcon.jsx';
import {useLanguage} from '../i18n/LanguageContext.jsx';

const PRODUCTS_PER_PAGE = 2;

function ProductCarousel({title, products}) {
  const {t} = useLanguage();
  const [page, setPage] = useState(0);
  const dragStartRef = useRef(null);
  const pages = [];

  for (let index = 0; index < products.length; index += PRODUCTS_PER_PAGE) {
    pages.push(products.slice(index, index + PRODUCTS_PER_PAGE));
  }

  useEffect(() => {
    setPage(0);
  }, [products]);

  function move(direction) {
    setPage(current => {
      const next = current + direction;
      if (next < 0) return pages.length - 1;
      if (next >= pages.length) return 0;
      return next;
    });
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragStartRef.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    if (dragStartRef.current === null) return;
    const distance = event.clientX - dragStartRef.current;
    dragStartRef.current = null;
    if (Math.abs(distance) < 42) return;
    move(distance < 0 ? 1 : -1);
  }

  const pageWidth = 100 / pages.length;

  return (
    <Box sx={{display: {xs: 'block', lg: 'none'}, position: 'relative'}}>
      <Box
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStartRef.current = null; }}
        sx={{overflow: 'hidden', mx: {xs: -0.5, sm: 0}, px: {xs: 0.5, sm: 0}, touchAction: 'pan-y'}}
      >
        <Box
          sx={{
            display: 'flex',
            width: `${pages.length * 100}%`,
            transform: `translate3d(-${page * pageWidth}%, 0, 0)`,
            transition: 'transform 420ms cubic-bezier(.22,.61,.36,1)',
            willChange: 'transform'
          }}
        >
          {pages.map((items, pageIndex) => (
            <Box
              key={`${title}-${pageIndex}`}
              aria-hidden={pageIndex !== page}
              sx={{
                display: 'grid',
                width: `${pageWidth}%`,
                flex: '0 0 auto',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: {xs: 1, sm: 1.6},
                px: '1px'
              }}
            >
              {items.map(product => <ProductCard key={product._id} product={product}/>)}
            </Box>
          ))}
        </Box>
      </Box>

      {pages.length > 1 && (
        <>
          <IconButton
            aria-label={t('home.previous')}
            onClick={() => move(-1)}
            sx={{
              position: 'absolute',
              zIndex: 2,
              left: {xs: -9, sm: -18},
              top: '43%',
              width: {xs: 34, sm: 40},
              height: {xs: 34, sm: 40},
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,.94)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 22px rgba(0,0,0,.14)',
              '&:hover': {bgcolor: 'common.white', color: 'secondary.main'}
            }}
          >
            <UiIcon name="arrowLeft" sx={{fontSize: 20}}/>
          </IconButton>
          <IconButton
            aria-label={t('home.next')}
            onClick={() => move(1)}
            sx={{
              position: 'absolute',
              zIndex: 2,
              right: {xs: -9, sm: -18},
              top: '43%',
              width: {xs: 34, sm: 40},
              height: {xs: 34, sm: 40},
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,.94)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 22px rgba(0,0,0,.14)',
              '&:hover': {bgcolor: 'common.white', color: 'secondary.main'}
            }}
          >
            <UiIcon name="arrowRight" sx={{fontSize: 20}}/>
          </IconButton>
          <Stack direction="row" justifyContent="center" spacing={0.7} sx={{mt: 1.7}}>
            {pages.map((_, index) => (
              <Box
                key={index}
                component="button"
                type="button"
                aria-label={`${title} ${index + 1}`}
                aria-current={index === page ? 'true' : undefined}
                onClick={() => setPage(index)}
                sx={{
                  width: index === page ? 24 : 7,
                  height: 7,
                  p: 0,
                  border: 0,
                  borderRadius: 99,
                  bgcolor: index === page ? 'secondary.main' : 'action.disabled',
                  cursor: 'pointer',
                  transition: 'width 220ms ease, background-color 220ms ease'
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

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
      <ProductCarousel title={title} products={products}/>
      <Box
        sx={{
          display: {xs: 'none', lg: 'grid'},
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 1.6
        }}
      >
        {products.map(product => <ProductCard key={product._id} product={product}/>)}
      </Box>
    </HomeSectionPanel>
  );
}
