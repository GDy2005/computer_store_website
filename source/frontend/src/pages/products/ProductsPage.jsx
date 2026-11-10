import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
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
import UiIcon from '../../components/UiIcon.jsx';

const sortOptions = [
  ['newest', 'products.newest'],
  ['best_selling', 'products.bestSelling'],
  ['price_asc', 'products.priceAsc'],
  ['price_desc', 'products.priceDesc'],
  ['name_asc', 'products.nameAsc'],
  ['name_desc', 'products.nameDesc']
];

function FilterGroup({title, options, selected, onSelect, onClear, clearLabel, visibleLimit = 0, moreLabel, lessLabel}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = visibleLimit > 0 && options.length > visibleLimit;
  const visibleOptions = hasMore && !expanded
    ? options.filter((option, index) => index < visibleLimit || option.value === selected)
    : options;

  return (
    <Box component="section" aria-label={title}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{mb: 1.1}}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{width: 3, height: 17, bgcolor: 'secondary.main', borderRadius: 1}}/>
          <Typography component="h3" fontSize="0.96rem" fontWeight={800}>{title}</Typography>
        </Stack>
        <IconButton
          size="small"
          onClick={onClear}
          disabled={!selected}
          aria-label={`${clearLabel}: ${title}`}
          sx={{width: 28, height: 28, color: 'text.secondary', opacity: selected ? 1 : 0, '&:hover': {color: 'error.main', bgcolor: '#fff2ee'}}}
        >
          <UiIcon name="close" sx={{fontSize: 15}}/>
        </IconButton>
      </Stack>
      <Stack spacing={0.35}>
        {visibleOptions.map(option => (
          <Box
            component="label"
            key={option.value}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.15, minHeight: 40,
              px: 1.1, mx: -1.1, borderRadius: 1,
              cursor: option.count === 0 && selected !== option.value ? 'default' : 'pointer',
              color: option.count === 0 && selected !== option.value ? 'text.disabled' : 'text.primary',
              bgcolor: selected === option.value ? '#e8f3ef' : 'transparent',
              transition: 'background-color 160ms ease',
              '&:hover': {bgcolor: option.count === 0 && selected !== option.value ? 'transparent' : selected === option.value ? '#dceee6' : '#f7f7f5'}
            }}
          >
            <Checkbox
              size="small"
              checked={selected === option.value}
              disabled={option.count === 0 && selected !== option.value}
              onChange={() => onSelect(option.value)}
              inputProps={{'aria-label': option.label}}
              sx={{p: 0, borderRadius: 0, color: '#a4a4a0', '&.Mui-checked': {color: 'secondary.dark'}, '& .MuiSvgIcon-root': {fontSize: 21}}}
            />
            <Typography component="span" fontSize="0.88rem" fontWeight={selected === option.value ? 750 : 450} sx={{flex: 1, lineHeight: 1.3}}>{option.label}</Typography>
            <Typography component="span" fontSize="0.76rem" fontWeight={700} sx={{minWidth: 25, px: 0.65, py: 0.25, textAlign: 'center', borderRadius: 1, bgcolor: selected === option.value ? 'secondary.main' : '#f3f3f1', color: selected === option.value ? 'secondary.contrastText' : 'text.secondary'}}>{option.count}</Typography>
          </Box>
        ))}
      </Stack>
      {hasMore && (
        <Button
          type="button"
          size="small"
          onClick={() => setExpanded(value => !value)}
          sx={{mt: 1, px: 0, minHeight: 28, color: 'text.primary', fontSize: 12.5, fontWeight: 750, '&:hover': {bgcolor: 'transparent', color: 'secondary.dark'}}}
        >
          {expanded ? lessLabel : moreLabel}
        </Button>
      )}
    </Box>
  );
}

function queryFromParams(params) {
  const rawPage = params.get('page') || '';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;

  return {
    page: Number.isSafeInteger(page) && page >= 1 ? page : 1,
    limit: 12,
    search: params.get('search') || '',
    category: params.get('category') || '',
    brand: params.get('brand') || '',
    inStock: params.get('inStock') || '',
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
  const [filterOptions, setFilterOptions] = useState({categories: [], brands: [], availability: {inStock: 0, outOfStock: 0}, priceRange: {min: 0, max: 0}});
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

  function changeFacet(field, value = '') {
    const next = new URLSearchParams(searchParams);
    if (!value || next.get(field) === value) next.delete(field);
    else next.set(field, value);
    next.delete('page');
    setSearchParams(next);
  }

  function applyFilters(event) {
    event.preventDefault();
    const next = new URLSearchParams();

    for (const field of ['search', 'category', 'brand', 'inStock', 'minPrice', 'maxPrice', 'minRating']) {
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
    <Stack spacing={3.5}>
      <Box>
        <Typography component="p" variant="overline" color="primary.main" fontWeight={800}>
          Catalog
        </Typography>
        <Typography component="h1" variant="h3" fontWeight={850}>{t('products.title')}</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>
          {t('products.description')}
        </Typography>
      </Box>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '290px minmax(0, 1fr)'}, gap: {xs: 2, md: 3}, alignItems: 'start'}}>
        <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{overflow: 'hidden', borderRadius: 1.5, borderColor: 'rgba(21,21,21,.1)', boxShadow: '0 12px 34px rgba(22,22,22,.045)'}}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{px: 2.5, py: 2.1, bgcolor: 'primary.main', color: '#fff', borderBottom: '3px solid', borderColor: 'secondary.main'}}>
            <Typography component="h2" variant="h6" fontWeight={850}>{t('products.filters')}</Typography>
            <Button type="button" size="small" onClick={() => setSearchParams({})} sx={{color: '#b9dfcf', fontSize: 12, minHeight: 30, px: 0.6, '&:hover': {bgcolor: 'rgba(255,255,255,.1)'}}}>{t('products.clear')}</Button>
          </Stack>
          <Stack spacing={2.5} sx={{p: 2.5}}>
            <TextField
              label={t('products.keyword')}
              value={draft.search}
              onChange={event => updateDraft('search', event.target.value)}
              inputProps={{maxLength: 100}}
              size="small"
              InputProps={{startAdornment: <InputAdornment position="start"><UiIcon name="search" sx={{fontSize: 19, color: 'text.secondary'}}/></InputAdornment>}}
              sx={{'& .MuiOutlinedInput-root': {bgcolor: '#fafaf9'}}}
              fullWidth
            />
            <Divider/>
            <FilterGroup
              title={t('products.category')}
              options={filterOptions.categories.map(category => ({value: category.slug, label: category.name, count: category.count || 0}))}
              selected={query.category}
              onSelect={value => changeFacet('category', value)}
              onClear={() => changeFacet('category')}
              clearLabel={t('products.clear')}
            />
            <Divider/>
            <FilterGroup
              title={t('products.brand')}
              options={filterOptions.brands.map(brand => ({value: brand.name, label: brand.name, count: brand.count || 0}))}
              selected={query.brand}
              onSelect={value => changeFacet('brand', value)}
              onClear={() => changeFacet('brand')}
              clearLabel={t('products.clear')}
              visibleLimit={6}
              moreLabel={t('products.showMore')}
              lessLabel={t('products.showLess')}
            />
            <Divider/>
            <FilterGroup
              title={t('products.availability')}
              options={[
                {value: 'true', label: t('products.inStock'), count: filterOptions.availability?.inStock || 0},
                {value: 'false', label: t('products.outOfStock'), count: filterOptions.availability?.outOfStock || 0}
              ]}
              selected={query.inStock}
              onSelect={value => changeFacet('inStock', value)}
              onClear={() => changeFacet('inStock')}
              clearLabel={t('products.clear')}
            />
            <Divider/>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{width: 3, height: 17, bgcolor: 'secondary.main', borderRadius: 1}}/>
              <Typography component="h3" fontSize="0.96rem" fontWeight={800}>{t('products.priceRange')}</Typography>
            </Stack>
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
              <TextField
                label={t('products.priceFrom')}
                type="number"
                size="small"
                value={draft.minPrice}
                onChange={event => updateDraft('minPrice', event.target.value)}
                inputProps={{min: 0, step: 100000}}
              />
              <TextField
                label={t('products.priceTo')}
                type="number"
                size="small"
                value={draft.maxPrice}
                onChange={event => updateDraft('maxPrice', event.target.value)}
                inputProps={{min: 0, step: 100000}}
              />
            </Stack>
            <Divider/>
            <FormControl fullWidth size="small">
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
            <Button type="submit" variant="contained" size="large" sx={{borderRadius: 1, '&:hover': {bgcolor: '#333'}}}>{t('products.apply')}</Button>
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
            <Box sx={{display: 'grid', gridTemplateColumns: {xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))'}, gap: {xs: 1.25, sm: 2}}}>
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
