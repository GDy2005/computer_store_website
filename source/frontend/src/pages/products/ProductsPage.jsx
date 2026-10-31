import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {useSearchParams} from 'react-router-dom';

import ProductCard from '../../features/products/ProductCard.jsx';
import {
  catalogErrorMessage,
  fetchProductFilters,
  fetchProducts
} from '../../features/products/catalogApi.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

const sortOptions = [
  ['newest', 'products.newest'],
  ['best_selling', 'products.bestSelling'],
  ['price_asc', 'products.priceAsc'],
  ['price_desc', 'products.priceDesc'],
  ['name_asc', 'products.nameAsc'],
  ['name_desc', 'products.nameDesc']
];

function queryFromParams(params) {
  const rawPage = params.get('page') || '';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;

  return {
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    limit: 12,
    search: params.get('search') || '',
    category: params.get('category') || '',
    brand: params.get('brand') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    minRating: params.get('minRating') || '',
    sort: params.get('sort') || 'newest'
  };
}

export default function ProductsPage() {
  const {locale, t} = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();
  const query = useMemo(
    () => queryFromParams(searchParams),
    [paramsKey]
  );
  const [draft, setDraft] = useState(query);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({page: 1, limit: 12, totalItems: 0, totalPages: 1});
  const [filterOptions, setFilterOptions] = useState({categories: [], brands: [], priceRange: {min: 0, max: 0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(query);
  }, [paramsKey]);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductFilters({signal: controller.signal})
      .then(setFilterOptions)
      .catch(errorValue => {
        const message = catalogErrorMessage(errorValue, t('products.filterError'));
        if (message) setError(message);
      });

    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchProducts(query, {signal: controller.signal})
      .then(result => {
        setProducts(result.items);
        setMeta(result.meta);
      })
      .catch(errorValue => {
        const message = catalogErrorMessage(errorValue, t('products.listError'));
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [paramsKey, t]);

  function updateDraft(field, value) {
    setDraft(current => ({...current, [field]: value}));
  }

  function applyFilters(event) {
    event.preventDefault();
    const next = new URLSearchParams();

    for (const field of ['search', 'category', 'brand', 'minPrice', 'maxPrice', 'minRating']) {
      if (draft[field] !== '') next.set(field, draft[field]);
    }

    if (draft.sort && draft.sort !== 'newest') next.set('sort', draft.sort);
    setSearchParams(next);
  }

  function changeSort(value) {
    const next = new URLSearchParams(searchParams);
    if (value === 'newest') next.delete('sort');
    else next.set('sort', value);
    next.delete('page');
    setSearchParams(next);
  }

  function changePage(_, page) {
    const next = new URLSearchParams(searchParams);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography component="p" variant="overline" color="secondary.main" fontWeight={800}>
          Catalog
        </Typography>
        <Typography component="h1" variant="h3" fontWeight={850}>{t('products.title')}</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>
          {t('products.description')}
        </Typography>
      </Box>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '280px minmax(0, 1fr)'}, gap: 3, alignItems: 'start'}}>
        <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2.5, position: {md: 'sticky'}, top: {md: 96}}}>
          <Stack spacing={2.25}>
            <Typography component="h2" variant="h6" fontWeight={800}>{t('products.filters')}</Typography>
            <TextField
              label={t('products.keyword')}
              value={draft.search}
              onChange={event => updateDraft('search', event.target.value)}
              inputProps={{maxLength: 100}}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="category-filter-label">{t('products.category')}</InputLabel>
              <Select
                labelId="category-filter-label"
                label={t('products.category')}
                value={draft.category}
                onChange={event => updateDraft('category', event.target.value)}
              >
                <MenuItem value="">{t('products.allCategories')}</MenuItem>
                {filterOptions.categories.map(category => (
                  <MenuItem key={category.slug} value={category.slug}>{category.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="brand-filter-label">{t('products.brand')}</InputLabel>
              <Select
                labelId="brand-filter-label"
                label={t('products.brand')}
                value={draft.brand}
                onChange={event => updateDraft('brand', event.target.value)}
              >
                <MenuItem value="">{t('products.allBrands')}</MenuItem>
                {filterOptions.brands.map(brand => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
              <TextField
                label={t('products.priceFrom')}
                type="number"
                value={draft.minPrice}
                onChange={event => updateDraft('minPrice', event.target.value)}
                inputProps={{min: 0, step: 100000}}
              />
              <TextField
                label={t('products.priceTo')}
                type="number"
                value={draft.maxPrice}
                onChange={event => updateDraft('maxPrice', event.target.value)}
                inputProps={{min: 0, step: 100000}}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="rating-filter-label">{t('products.minRating')}</InputLabel>
              <Select
                labelId="rating-filter-label"
                label={t('products.minRating')}
                value={draft.minRating}
                onChange={event => updateDraft('minRating', event.target.value)}
              >
                <MenuItem value="">{t('products.allRatings')}</MenuItem>
                {[4, 3, 2, 1].map(value => <MenuItem key={value} value={String(value)}>{t('products.starsUp',{count:value})}</MenuItem>)}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" size="large">{t('products.apply')}</Button>
            <Button type="button" color="inherit" onClick={() => setSearchParams({})}>{t('products.clear')}</Button>
            {filterOptions.priceRange.max > 0 && (
              <Typography variant="caption" color="text.secondary">
                {t('products.dataRange')}: {filterOptions.priceRange.min.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')}–{filterOptions.priceRange.max.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')} ₫
              </Typography>
            )}
          </Stack>
        </Paper>

        <Stack spacing={3}>
          <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems={{sm: 'center'}} justifyContent="space-between">
            <Typography fontWeight={700}>{t('products.count',{count:meta.totalItems})}</Typography>
            <FormControl size="small" sx={{minWidth: 190}}>
              <InputLabel id="sort-label">{t('products.sort')}</InputLabel>
              <Select labelId="sort-label" label={t('products.sort')} value={query.sort} onChange={event => changeSort(event.target.value)}>
                {sortOptions.map(([value, key]) => <MenuItem key={value} value={value}>{t(key)}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <Divider/>
          {error && <Alert severity="error">{error}</Alert>}
          {loading && (
            <Box sx={{display: 'grid', minHeight: 320, placeItems: 'center'}}>
              <CircularProgress aria-label={t('products.loading')}/>
            </Box>
          )}
          {!loading && !error && products.length === 0 && (
            <Alert severity="info">{t('products.empty')}</Alert>
          )}
          {!loading && !error && products.length > 0 && (
            <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))'}, gap: 2.5}}>
              {products.map(product => <ProductCard key={product._id} product={product}/>)}
            </Box>
          )}
          <Stack alignItems="center" spacing={1} sx={{pt: 1}}>
            <Pagination
              count={Math.max(1, meta.totalPages)}
              page={Math.min(query.page, Math.max(1, meta.totalPages))}
              onChange={changePage}
              color="primary"
              siblingCount={0}
              showFirstButton
              showLastButton
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              {t('products.page',{current:Math.min(query.page, Math.max(1, meta.totalPages)),total:Math.max(1, meta.totalPages)})}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
