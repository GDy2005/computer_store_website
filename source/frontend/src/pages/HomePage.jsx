import {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import {Link} from 'react-router-dom';

import HomeSectionPanel from '../components/HomeSectionPanel.jsx';
import UiIcon from '../components/UiIcon.jsx';
import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import ProductSection from '../features/products/ProductSection.jsx';
import {
  catalogErrorMessage,
  fetchCategories,
  fetchProducts
} from '../features/products/catalogApi.js';

const promotionSlides = [
  {src: '/banners/halloween-sale.jpg', alt: 'Halloween săn deal build PC cực chill', titleKey: 'home.banner.halloweenTitle', textKey: 'home.banner.halloweenText'},
  {src: '/banners/delta-force.jpg', alt: 'Top cấu hình PC chiến Delta Force', titleKey: 'home.banner.deltaTitle', textKey: 'home.banner.deltaText'},
  {src: '/banners/premium-gaming.jpg', alt: 'PC Premium Gaming tốc độ bứt phá', titleKey: 'home.banner.premiumTitle', textKey: 'home.banner.premiumText'},
  {src: '/banners/doi-pc-10-ngay.jpg', alt: 'Đổi PC trong 10 ngày', titleKey: 'home.banner.exchangeTitle', textKey: 'home.banner.exchangeText'}
];

const CAROUSEL_GAP = 10;

const categoryColors = [
  ['#f2f2f0', '#181818'],
  ['#e5f2ed', '#1f6b50'],
  ['#eeeeeb', '#181818'],
  ['#edf5f1', '#174b39'],
  ['#ececea', '#181818'],
  ['#e6efeb', '#12392c']
];

function categoryIconName(slug = '') {
  if (slug === 'pc') return 'desktop';
  if (slug.includes('laptop')) return 'laptop';
  if (slug.includes('man-hinh')) return 'monitor';
  if (slug.includes('ban-phim')) return 'keyboard';
  if (slug.includes('chuot')) return 'mouse';
  if (slug.includes('ssd') || slug.includes('luu-tru')) return 'storage';
  return 'package';
}

function CategoryCard({name, slug, index}) {
  const [background, color] = categoryColors[index % categoryColors.length];

  return (
    <Stack
      component={Link}
      to={`/products?category=${slug}`}
      alignItems="center"
      spacing={1.4}
      sx={{color: 'inherit', textDecoration: 'none', textAlign: 'center', minWidth: 0, '&:hover .category-bubble': {transform: 'translateY(-6px) scale(1.035)', boxShadow: '0 14px 30px rgba(31,41,55,.14)'}}}
    >
      <Box
        className="category-bubble"
        aria-hidden="true"
        sx={{
          display: 'grid',
          width: {xs: 104, sm: 122},
          height: {xs: 104, sm: 122},
          placeItems: 'center',
          borderRadius: '50%',
          bgcolor: background,
          border: '1px solid rgba(31,41,55,.07)',
          color,
          transition: 'transform 220ms ease, box-shadow 220ms ease'
        }}
      >
        <UiIcon name={categoryIconName(slug)} sx={{fontSize: {xs: 45, sm: 54}}}/>
      </Box>
      <Typography component="h3" fontWeight={800} noWrap sx={{width: '100%'}}>{name}</Typography>
    </Stack>
  );
}

function PromotionCarousel() {
  const {t} = useLanguage();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [active, setActive] = useState(0);
  const [trackIndex, setTrackIndex] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const viewportRef = useRef(null);
  const dragStartXRef = useRef(null);
  const draggedRef = useRef(false);
  const movingRef = useRef(false);

  const showPrevious = useCallback(() => {
    if (!reducedMotion && movingRef.current) return;
    const nextActive = (active - 1 + promotionSlides.length) % promotionSlides.length;
    setActive(nextActive);
    if (reducedMotion) {
      setTrackIndex(nextActive + 1);
      return;
    }
    movingRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex(current => current - 1);
  }, [active, reducedMotion]);

  const showNext = useCallback(() => {
    if (!reducedMotion && movingRef.current) return;
    const nextActive = (active + 1) % promotionSlides.length;
    setActive(nextActive);
    if (reducedMotion) {
      setTrackIndex(nextActive + 1);
      return;
    }
    movingRef.current = true;
    setTransitionEnabled(true);
    setTrackIndex(current => current + 1);
  }, [active, reducedMotion]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return undefined;
    const updateWidth = () => setViewportWidth(node.getBoundingClientRect().width);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (dragging) return undefined;
    const timer = window.setTimeout(showNext, 5000);
    return () => window.clearTimeout(timer);
  }, [active, dragging, showNext]);

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragStartXRef.current = event.clientX;
    draggedRef.current = false;
    movingRef.current = false;
    setDragging(true);
    setTransitionEnabled(false);
    setDragOffset(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (dragStartXRef.current === null) return;
    const distance = event.clientX - dragStartXRef.current;
    const limit = Math.max(120, viewportWidth * 0.92);
    draggedRef.current = Math.abs(distance) > 8;
    setDragOffset(Math.max(-limit, Math.min(limit, distance)));
  }

  function handlePointerUp(event) {
    if (dragStartXRef.current === null) return;
    const distance = event.clientX - dragStartXRef.current;
    const threshold = Math.max(44, Math.min(90, viewportWidth * 0.12));
    dragStartXRef.current = null;
    setDragging(false);
    setTransitionEnabled(true);
    setDragOffset(0);
    if (Math.abs(distance) > threshold) {
      draggedRef.current = true;
      if (distance < 0) showNext();
      else showPrevious();
    }
    window.setTimeout(() => { draggedRef.current = false; }, 0);
  }

  function handleCarouselClick(event) {
    if (draggedRef.current || event.target.closest?.('a, button')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    if (relativeX <= bounds.width * 0.24) showPrevious();
    if (relativeX >= bounds.width * 0.76) showNext();
  }

  function handleCarouselKeyDown(event) {
    if (event.key === 'ArrowLeft') showPrevious();
    if (event.key === 'ArrowRight') showNext();
  }

  function cancelDrag() {
    dragStartXRef.current = null;
    setDragging(false);
    setTransitionEnabled(true);
    setDragOffset(0);
  }

  function goToSlide(index) {
    if (index === active || (!reducedMotion && movingRef.current)) return;
    movingRef.current = !reducedMotion;
    setTransitionEnabled(true);
    setActive(index);
    setTrackIndex(index + 1);
  }

  function handleTrackTransitionEnd(event) {
    if (event.propertyName !== 'transform') return;
    if (trackIndex === 0 || trackIndex === promotionSlides.length + 1) {
      const normalizedIndex = trackIndex === 0 ? promotionSlides.length : 1;
      setTransitionEnabled(false);
      setTrackIndex(normalizedIndex);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
          movingRef.current = false;
        });
      });
      return;
    }
    movingRef.current = false;
  }

  const slide = promotionSlides[active];
  const renderedSlides = [
    {...promotionSlides[promotionSlides.length - 1], renderKey: 'clone-last'},
    ...promotionSlides.map((item, index) => ({...item, renderKey: `slide-${index}`})),
    {...promotionSlides[0], renderKey: 'clone-first'}
  ];
  const trackOffset = viewportWidth
    ? -(trackIndex * (viewportWidth + CAROUSEL_GAP)) + dragOffset
    : 0;

  return (
    <Box component="section" aria-labelledby="promotion-heading">
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{mb: 2}}>
        <Box>
          <Typography id="promotion-heading" component="h1" variant="h5" fontWeight={850}>{t('home.promotion')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('home.promotionDescription')}</Typography>
        </Box>
        <Button component={Link} to="/products" endIcon={<UiIcon name="arrowRight"/>} sx={{display: {xs: 'none', sm: 'inline-flex'}}}>
          {t('common.viewAll')}
        </Button>
      </Stack>

      <Paper
        ref={viewportRef}
        variant="outlined"
        aria-roledescription="carousel"
        aria-label={t('home.slideLabel')}
        tabIndex={0}
        onClickCapture={event => {
          if (draggedRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onClick={handleCarouselClick}
        onKeyDown={handleCarouselKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelDrag}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '2856 / 1087',
          borderRadius: '6px',
          bgcolor: 'common.white',
          boxShadow: '0 12px 34px rgba(0,0,0,.12)',
          cursor: 'grab',
          touchAction: 'pan-y',
          userSelect: 'none',
          '&:active': {cursor: 'grabbing'},
          '&:focus-visible': {outline: '3px solid', outlineColor: 'secondary.main', outlineOffset: 3}
        }}
      >
        <Box
          onTransitionEnd={handleTrackTransitionEnd}
          sx={{
            display: 'flex',
            gap: `${CAROUSEL_GAP}px`,
            width: 'max-content',
            height: '100%',
            opacity: viewportWidth ? 1 : 0,
            transform: `translate3d(${trackOffset}px, 0, 0)`,
            transition: dragging || !transitionEnabled || reducedMotion
              ? 'none'
              : 'transform 560ms cubic-bezier(.22,.61,.36,1)',
            willChange: 'transform'
          }}
        >
          {renderedSlides.map((item, index) => (
            <Box
              key={item.renderKey}
              aria-hidden={index !== trackIndex}
              sx={{
                position: 'relative',
                width: viewportWidth ? `${viewportWidth}px` : 0,
                height: '100%',
                flex: '0 0 auto',
                overflow: 'hidden',
                borderRadius: '6px',
                bgcolor: item.background || '#111',
                '&::before': item.fit === 'contain' ? {
                  content: '""',
                  position: 'absolute',
                  inset: -24,
                  backgroundImage: `url(${item.src})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                  filter: 'blur(20px)',
                  opacity: 0.72,
                  transform: 'scale(1.06)'
                } : undefined
              }}
            >
              <Box
                component="img"
                src={item.src}
                alt={index === trackIndex ? item.alt : ''}
                draggable={false}
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: item.fit || 'cover',
                  pointerEvents: 'none'
                }}
              />
            </Box>
          ))}
        </Box>

        <Stack
          key={`caption-${active}`}
          spacing={{xs: 0.6, sm: 1}}
          sx={{
            position: 'absolute',
            left: {xs: 14, sm: 28, md: 44},
            bottom: {xs: 22, sm: 32, md: 42},
            zIndex: 2,
            maxWidth: {xs: '64%', sm: 440},
            color: 'common.white',
            textShadow: '0 2px 14px rgba(0,0,0,.8)'
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontSize: {xs: '1.05rem', sm: '1.8rem', md: '2.35rem'},
              lineHeight: 1.05,
              fontWeight: 900,
              animation: reducedMotion ? 'none' : 'banner-copy-in 720ms 120ms cubic-bezier(.2,.75,.25,1) both',
              '@keyframes banner-copy-in': {from: {opacity: 0, transform: 'translateY(16px)'}, to: {opacity: 1, transform: 'translateY(0)'}}
            }}
          >
            {t(slide.titleKey)}
          </Typography>
          <Typography sx={{display: {xs: 'none', sm: 'block'}, color: 'rgba(255,255,255,.84)', fontWeight: 650, animation: reducedMotion ? 'none' : 'banner-copy-in 720ms 260ms cubic-bezier(.2,.75,.25,1) both'}}>
            {t(slide.textKey)}
          </Typography>
          <Button
            component={Link}
            to="/products"
            variant="contained"
            color="secondary"
            size="large"
            sx={{
              alignSelf: 'flex-start',
              mt: {xs: 0.4, sm: 0.8},
              borderRadius: 99,
              px: {xs: 2, sm: 3},
              minHeight: {xs: 34, sm: 46},
              fontSize: {xs: 11, sm: 14},
              letterSpacing: 1,
              animation: reducedMotion ? 'none' : 'banner-copy-in 720ms 420ms cubic-bezier(.2,.75,.25,1) both'
            }}
          >
            {t('home.shopNow')}
          </Button>
        </Stack>

        <Box aria-hidden="true" sx={{position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(0,0,0,.52) 0%, rgba(0,0,0,.16) 34%, transparent 62%)'}}/>

        <Stack direction="row" spacing={0.8} sx={{position: 'absolute', zIndex: 3, left: '50%', bottom: {xs: 8, md: 16}, transform: 'translateX(-50%)'}}>
          {promotionSlides.map((item, index) => (
            <Box
              key={item.src}
              component="button"
              type="button"
              aria-label={t('home.goToSlide', {number: index + 1})}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => goToSlide(index)}
              sx={{
                width: index === active ? 30 : 9,
                height: 9,
                p: 0,
                border: '1px solid rgba(255,255,255,.7)',
                borderRadius: 9,
                bgcolor: index === active ? 'secondary.main' : 'rgba(255,255,255,.72)',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                transition: 'width 220ms ease, background-color 220ms ease'
              }}
            />
          ))}
        </Stack>

        {!reducedMotion && (
          <Box
            key={`progress-${active}`}
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              height: 3,
              bgcolor: 'secondary.main',
              animation: 'promotion-progress 5000ms linear both',
              '@keyframes promotion-progress': {from: {width: 0}, to: {width: '100%'}}
            }}
          />
        )}
      </Paper>
    </Box>
  );
}

function TrustStrip() {
  const {t} = useLanguage();
  const items = [
    ['package', t('home.trustStock'), t('home.trustStockText')],
    ['chat', t('home.trustAi'), t('home.trustAiText')],
    ['receipt', t('home.trustCheckout'), t('home.trustCheckoutText')]
  ];

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'repeat(3, 1fr)'}, overflow: 'hidden', borderTop: '3px solid #151515'}}
    >
      {items.map(([icon, title, text], index) => (
        <Stack
          key={title}
          direction="row"
          spacing={1.5}
          sx={{
            p: 2.25,
            color: index === 1 ? 'common.white' : 'text.primary',
            bgcolor: index === 1 ? '#171918' : 'secondary.light',
            borderRight: {md: index < 2 ? '1px solid' : 0},
            borderBottom: {xs: index < 2 ? '1px solid' : 0, md: 0},
            borderColor: index === 1 ? 'rgba(255,255,255,.12)' : 'divider'
          }}
        >
          <Box sx={{display: 'grid', placeItems: 'center', width: 42, height: 42, flexShrink: 0, borderRadius: 2, bgcolor: index === 1 ? 'secondary.main' : '#151515', color: 'common.white'}}>
            <UiIcon name={icon}/>
          </Box>
          <Box>
            <Typography fontWeight={850}>{title}</Typography>
            <Typography variant="body2" sx={{color: index === 1 ? 'rgba(255,255,255,.65)' : 'text.secondary'}} mt={0.25}>{text}</Typography>
          </Box>
        </Stack>
      ))}
    </Paper>
  );
}

export default function HomePage() {
  const {t} = useLanguage();
  const [categories, setCategories] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categorySections, setCategorySections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [items, newest, best] = await Promise.all([
        fetchCategories({featured: true}),
        fetchProducts({page: 1, limit: 5, sort: 'newest'}),
        fetchProducts({page: 1, limit: 5, sort: 'best_selling'})
      ]);

      const sectionResults = await Promise.all(
        items.slice(0, 3).map(async category => ({
          category,
          products: (await fetchProducts({page: 1, limit: 5, category: category.slug, sort: 'name_asc'})).items
        }))
      );

      setCategories(items);
      setNewProducts(newest.items);
      setBestSellers(best.items);
      setCategorySections(sectionResults);
    } catch (errorValue) {
      setError(catalogErrorMessage(errorValue, 'Không tải được dữ liệu catalog.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <Stack spacing={{xs: 5, md: 7}}>
      <PromotionCarousel/>
      <TrustStrip/>

      <HomeSectionPanel
        id="categories"
        titleId="category-heading"
        title={t('home.categories')}
        description={t('home.categoriesDescription')}
        actionTo="/products"
        icon="grid"
      >
        {loading && (
          <Box aria-label="Loading categories" sx={{display: 'grid', gridTemplateColumns: {xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)'}, gap: 2}}>
            {Array.from({length: 6}, (_, index) => <Skeleton key={index} variant="circular" width={122} height={122} sx={{mx: 'auto'}}/>)}
          </Box>
        )}
        {error && (
          <Alert severity="error" action={<Button color="inherit" onClick={loadCategories}>{t('common.retry')}</Button>}>
            {error}
          </Alert>
        )}
        {!loading && !error && categories.length === 0 && <Alert severity="info">{t('home.noCategories')}</Alert>}
        {!loading && !error && categories.length > 0 && (
          <Box sx={{display: 'grid', gridTemplateColumns: {xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))'}, gap: {xs: 2.5, md: 3}}}>
            {categories.map((category, index) => <CategoryCard key={category._id || category.slug} {...category} index={index}/>)}
          </Box>
        )}
      </HomeSectionPanel>

      {!loading && !error && <ProductSection title={t('home.newProducts')} description={t('home.newDescription')} products={newProducts} actionTo="/products?sort=newest" icon="package"/>}
      {!loading && !error && <ProductSection title={t('home.selling')} description={t('home.sellingDescription')} products={bestSellers} actionTo="/products?sort=best_selling" icon="cart"/>}
      {!loading && !error && categorySections.map(({category, products}) => (
        <ProductSection
          key={category.slug}
          title={category.name}
          description={category.description}
          products={products}
          actionTo={`/products?category=${category.slug}`}
          icon={categoryIconName(category.slug)}
        />
      ))}
    </Stack>
  );
}
