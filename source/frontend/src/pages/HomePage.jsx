import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import {Link} from 'react-router-dom';

import UiIcon from '../components/UiIcon.jsx';
import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import ProductSection from '../features/products/ProductSection.jsx';
import {
  catalogErrorMessage,
  fetchCategories,
  fetchProducts
} from '../features/products/catalogApi.js';
import {
  formatProductPrice,
  handleImageError,
  productImage
} from '../features/products/productFormat.js';

const heroPalettes = [
  ['#071d19','#124c3d','#f0a93a'],
  ['#111b2c','#21446b','#6cc3bd'],
  ['#281a13','#874d25','#f0b75b'],
  ['#21172b','#5a356e','#e5a23e']
];

function getCategoryCode(name) {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0,3).toUpperCase();
}

function CategoryCard({name, description, slug, index}) {
  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        height:'100%',overflow:'hidden',position:'relative',
        transition:'transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
        '&:hover':{transform:'translateY(-6px)',boxShadow:'0 22px 48px rgba(18,76,61,0.12)',borderColor:'rgba(18,76,61,0.3)'},
        '&::after':{content:'""',position:'absolute',width:90,height:90,right:-42,bottom:-45,borderRadius:'50%',bgcolor:'secondary.light'}
      }}
    >
      <Stack
        component={Link}
        to={`/products?category=${slug}`}
        spacing={1.5}
        sx={{height:'100%',minHeight:190,p:2.5,color:'inherit',textDecoration:'none',position:'relative',zIndex:1}}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box
            aria-hidden="true"
            sx={{
              display:'grid',width:48,height:48,placeItems:'center',borderRadius:'14px 14px 5px 14px',
              bgcolor:'primary.main',color:'primary.contrastText',fontSize:13,fontWeight:900,
              boxShadow:'8px 8px 0 rgba(238,166,51,0.22)'
            }}
          >
            {getCategoryCode(name)}
          </Box>
          <Typography variant="overline" color="text.secondary" fontWeight={850}>0{index + 1}</Typography>
        </Stack>
        <Typography component="h3" variant="h6" fontWeight={850}>{name}</Typography>
        <Typography color="text.secondary" variant="body2" sx={{lineHeight:1.65}}>{description}</Typography>
        <Box sx={{flexGrow:1}}/>
        <UiIcon name="arrowRight" color="secondary"/>
      </Stack>
    </Paper>
  );
}

function HeroCarousel({products}) {
  const {t} = useLanguage();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = products.length ? products.slice(0,4) : [null];

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return undefined;
    const timer = setInterval(() => {
      setActive(current => (current + 1) % slides.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, slides.length]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  const slide = slides[active];
  const palette = heroPalettes[active % heroPalettes.length];
  const previous = () => setActive(current => (current - 1 + slides.length) % slides.length);
  const next = () => setActive(current => (current + 1) % slides.length);

  return (
    <Paper
      component="section"
      elevation={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={t('home.slideLabel')}
      sx={{
        position:'relative',isolation:'isolate',overflow:'hidden',minHeight:{xs:630,sm:680,md:560},
        borderRadius:{xs:4,md:5},color:'common.white',
        background:`linear-gradient(125deg, ${palette[0]} 0%, ${palette[1]} 67%, ${palette[2]} 145%)`,
        boxShadow:'0 30px 80px rgba(8,46,38,0.22)',
        transition:'background 600ms ease',
        '&::before':{
          content:'""',position:'absolute',inset:0,zIndex:-1,opacity:0.12,
          backgroundImage:'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
          backgroundSize:'48px 48px',maskImage:'linear-gradient(to right, black, transparent 72%)'
        },
        '&::after':{
          content:'""',position:'absolute',zIndex:-1,width:{xs:380,md:620},height:{xs:380,md:620},
          right:{xs:-160,md:-60},top:{xs:250,md:-120},borderRadius:'50%',
          border:'100px solid rgba(255,255,255,0.055)'
        }
      }}
    >
      <Box
        sx={{
          display:'grid',gridTemplateColumns:{xs:'1fr',md:'minmax(0,0.96fr) minmax(420px,1.04fr)'},
          minHeight:'inherit',alignItems:'center',gap:{xs:1,md:5},p:{xs:3,sm:5,md:7}
        }}
      >
        <Stack spacing={2.5} sx={{position:'relative',zIndex:2,maxWidth:670}}>
          <Stack direction="row" alignItems="center" spacing={1.3}>
            <Box sx={{width:36,height:2,bgcolor:'secondary.main'}}/>
            <Typography variant="overline" fontWeight={900} letterSpacing={2.2} color="secondary.light">
              {t('home.eyebrow')}
            </Typography>
          </Stack>
          <Typography
            key={`title-${active}`}
            component="h1"
            sx={{
              fontSize:{xs:'2.5rem',sm:'3.6rem',md:'4.5rem'},lineHeight:0.98,
              fontWeight:950,letterSpacing:'-0.055em',maxWidth:650,
              animation:'hero-copy-in 560ms ease both',
              '@keyframes hero-copy-in':{from:{opacity:0,transform:'translateY(18px)'},to:{opacity:1,transform:'translateY(0)'}}
            }}
          >
            {slide?.name || t('home.title')}
          </Typography>
          <Typography sx={{maxWidth:590,color:'rgba(255,255,255,0.76)',fontSize:{xs:'1rem',md:'1.12rem'},lineHeight:1.75}}>
            {slide?.shortDescription || t('home.description')}
          </Typography>
          {slide && (
            <Typography fontWeight={900} color="secondary.light" fontSize="1.15rem">
              {formatProductPrice(slide)}
            </Typography>
          )}
          <Stack direction={{xs:'column',sm:'row'}} spacing={1.5} alignItems={{sm:'center'}}>
            <Button
              component={Link}
              to={slide ? `/products/${slide.slug}` : '/products'}
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<UiIcon name="arrowRight"/>}
            >
              {t('home.shopNow')}
            </Button>
            <Button
              component={Link}
              to="/products?sort=best_selling"
              variant="text"
              size="large"
              sx={{color:'common.white',alignSelf:{xs:'flex-start',sm:'auto'},'&:hover':{bgcolor:'rgba(255,255,255,0.1)'}}}
            >
              {t('home.bestSellers')}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{position:'relative',height:{xs:265,sm:320,md:430},alignSelf:{xs:'end',md:'center'}}}>
          <Box
            sx={{
              position:'absolute',inset:{xs:'10px 8px 0',md:'0 0 0 18px'},
              borderRadius:'48% 52% 24% 76% / 52% 30% 70% 48%',
              bgcolor:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.18)',
              transform:'rotate(-3deg)'
            }}
          />
          {slide && (
            <Box
              key={`image-${active}`}
              component="img"
              src={productImage(slide)}
              alt={slide.images?.[0]?.alt || slide.name}
              onError={handleImageError}
              sx={{
                position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',p:{xs:1,md:2},
                filter:'drop-shadow(0 30px 30px rgba(0,0,0,0.3))',
                animation:'hero-image-in 650ms cubic-bezier(.2,.8,.2,1) both',
                '@keyframes hero-image-in':{from:{opacity:0,transform:'translateX(45px) scale(.94)'},to:{opacity:1,transform:'translateX(0) scale(1)'}}
              }}
            />
          )}
          <Chip
            label={`${String(active + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`}
            sx={{position:'absolute',right:12,top:8,bgcolor:'rgba(8,30,25,0.62)',color:'common.white',backdropFilter:'blur(10px)'}}
          />
        </Box>
      </Box>

      {slides.length > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{position:'absolute',right:{xs:24,md:38},bottom:{xs:22,md:28},zIndex:4}}
        >
          <IconButton aria-label={t('home.previous')} onClick={previous} sx={{color:'common.white',border:'1px solid rgba(255,255,255,.35)'}}>
            <UiIcon name="arrowLeft"/>
          </IconButton>
          <Stack direction="row" spacing={0.7}>
            {slides.map((item, index) => (
              <Box
                key={item?._id || index}
                component="button"
                type="button"
                aria-label={t('home.goToSlide',{number:index + 1})}
                aria-current={index === active ? 'true' : undefined}
                onClick={() => setActive(index)}
                sx={{
                  width:index === active ? 28 : 8,height:8,p:0,border:0,borderRadius:99,cursor:'pointer',
                  bgcolor:index === active ? 'secondary.main' : 'rgba(255,255,255,.4)',
                  transition:'width 220ms ease, background-color 220ms ease'
                }}
              />
            ))}
          </Stack>
          <IconButton aria-label={t('home.next')} onClick={next} sx={{color:'common.white',border:'1px solid rgba(255,255,255,.35)'}}>
            <UiIcon name="arrowRight"/>
          </IconButton>
        </Stack>
      )}
    </Paper>
  );
}

function TrustStrip() {
  const {t} = useLanguage();
  const items = [
    ['01',t('home.trustStock'),t('home.trustStockText')],
    ['02',t('home.trustAi'),t('home.trustAiText')],
    ['03',t('home.trustCheckout'),t('home.trustCheckoutText')]
  ];

  return (
    <Box
      component="section"
      sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(3,1fr)'},borderY:'1px solid',borderColor:'divider'}}
    >
      {items.map(([number,title,text], index) => (
        <Stack
          key={title}
          direction="row"
          spacing={2}
          sx={{py:3,px:{xs:0,md:3},borderRight:{md:index < 2 ? '1px solid' : 0},borderColor:'divider'}}
        >
          <Typography color="secondary.dark" fontWeight={900}>{number}</Typography>
          <Box>
            <Typography fontWeight={900}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>{text}</Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
}

export default function HomePage() {
  const {t} = useLanguage();
  const [categories,setCategories] = useState([]);
  const [newProducts,setNewProducts] = useState([]);
  const [bestSellers,setBestSellers] = useState([]);
  const [categorySections,setCategorySections] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const heroProducts = useMemo(() => {
    const unique = new Map();
    [...newProducts,...bestSellers].forEach(product => unique.set(product._id, product));
    return [...unique.values()].slice(0,4);
  }, [newProducts,bestSellers]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [items,newest,best] = await Promise.all([
        fetchCategories({featured:true}),
        fetchProducts({page:1,limit:4,sort:'newest'}),
        fetchProducts({page:1,limit:4,sort:'best_selling'})
      ]);

      const sectionResults = await Promise.all(
        items.slice(0,3).map(async category => ({
          category,
          products:(await fetchProducts({page:1,limit:4,category:category.slug,sort:'name_asc'})).items
        }))
      );

      setCategories(items);
      setNewProducts(newest.items);
      setBestSellers(best.items);
      setCategorySections(sectionResults);
    } catch (errorValue) {
      setError(catalogErrorMessage(errorValue,'Không tải được dữ liệu catalog.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <Stack spacing={{xs:6,md:10}}>
      <HeroCarousel products={heroProducts}/>
      <TrustStrip/>

      <Box component="section" aria-labelledby="category-heading">
        <Stack direction={{xs:'column',md:'row'}} spacing={2} justifyContent="space-between" alignItems={{md:'flex-end'}} sx={{mb:3.5}}>
          <Box maxWidth={680}>
            <Typography variant="overline" color="secondary.dark" fontWeight={900} letterSpacing={2}>EXPLORE</Typography>
            <Typography id="category-heading" component="h2" variant="h3">{t('home.categories')}</Typography>
            <Typography color="text.secondary" mt={1}>{t('home.categoriesDescription')}</Typography>
          </Box>
          <Button component={Link} to="/products" endIcon={<UiIcon name="arrowRight"/>}>{t('common.viewAll')}</Button>
        </Stack>
        {loading && (
          <Box aria-label="Loading categories" sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',lg:'repeat(5,1fr)'},gap:2}}>
            {Array.from({length:5}, (_, index) => <Skeleton key={index} variant="rounded" height={190}/>) }
          </Box>
        )}
        {error && (
          <Alert severity="error" action={<Button color="inherit" onClick={loadCategories}>{t('common.retry')}</Button>}>
            {error}
          </Alert>
        )}
        {!loading && !error && categories.length === 0 && <Alert severity="info">{t('home.noCategories')}</Alert>}
        {!loading && !error && categories.length > 0 && (
          <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,1fr)',lg:'repeat(5,1fr)'},gap:2}}>
            {categories.map((category,index) => <CategoryCard key={category._id || category.slug} {...category} index={index}/>) }
          </Box>
        )}
      </Box>

      {!loading && !error && <ProductSection title={t('home.newProducts')} description={t('home.newDescription')} products={newProducts} actionTo="/products?sort=newest"/>}
      {!loading && !error && <ProductSection title={t('home.selling')} description={t('home.sellingDescription')} products={bestSellers} actionTo="/products?sort=best_selling"/>}
      {!loading && !error && categorySections.map(({category,products}) => (
        <ProductSection
          key={category.slug}
          title={category.name}
          description={category.description}
          products={products}
          actionTo={`/products?category=${category.slug}`}
        />
      ))}
    </Stack>
  );
}
