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

const sortOptions = [
  ['newest', 'Mới nhất'],
  ['best_selling', 'Bán chạy nhất'],
  ['price_asc', 'Giá tăng dần'],
  ['price_desc', 'Giá giảm dần'],
  ['name_asc', 'Tên A–Z'],
  ['name_desc', 'Tên Z–A']
];

function queryFromParams(params) {
  return {
    page: Math.max(1, Number(params.get('page')) || 1),
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
        const message = catalogErrorMessage(errorValue, 'Không tải được dữ liệu bộ lọc.');
        if (message) setError(message);
      });

    return () => controller.abort();
  }, []);

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
        const message = catalogErrorMessage(errorValue, 'Không tải được danh sách sản phẩm.');
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [paramsKey]);

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
        <Typography component="h1" variant="h3" fontWeight={850}>Sản phẩm</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>
          Tìm cấu hình phù hợp bằng danh mục, thương hiệu, khoảng giá và đánh giá.
        </Typography>
      </Box>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '280px minmax(0, 1fr)'}, gap: 3, alignItems: 'start'}}>
        <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2.5, position: {md: 'sticky'}, top: {md: 96}}}>
          <Stack spacing={2.25}>
            <Typography component="h2" variant="h6" fontWeight={800}>Bộ lọc</Typography>
            <TextField
              label="Từ khóa"
              value={draft.search}
              onChange={event => updateDraft('search', event.target.value)}
              inputProps={{maxLength: 100}}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="category-filter-label">Danh mục</InputLabel>
              <Select
                labelId="category-filter-label"
                label="Danh mục"
                value={draft.category}
                onChange={event => updateDraft('category', event.target.value)}
              >
                <MenuItem value="">Tất cả danh mục</MenuItem>
                {filterOptions.categories.map(category => (
                  <MenuItem key={category.slug} value={category.slug}>{category.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="brand-filter-label">Thương hiệu</InputLabel>
              <Select
                labelId="brand-filter-label"
                label="Thương hiệu"
                value={draft.brand}
                onChange={event => updateDraft('brand', event.target.value)}
              >
                <MenuItem value="">Tất cả thương hiệu</MenuItem>
                {filterOptions.brands.map(brand => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Giá từ"
                type="number"
                value={draft.minPrice}
                onChange={event => updateDraft('minPrice', event.target.value)}
                inputProps={{min: 0, step: 100000}}
              />
              <TextField
                label="Giá đến"
                type="number"
                value={draft.maxPrice}
                onChange={event => updateDraft('maxPrice', event.target.value)}
                inputProps={{min: 0, step: 100000}}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="rating-filter-label">Đánh giá tối thiểu</InputLabel>
              <Select
                labelId="rating-filter-label"
                label="Đánh giá tối thiểu"
                value={draft.minRating}
                onChange={event => updateDraft('minRating', event.target.value)}
              >
                <MenuItem value="">Tất cả đánh giá</MenuItem>
                {[4, 3, 2, 1].map(value => <MenuItem key={value} value={String(value)}>{value} sao trở lên</MenuItem>)}
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" size="large">Áp dụng</Button>
            <Button type="button" color="inherit" onClick={() => setSearchParams({})}>Xóa bộ lọc</Button>
            {filterOptions.priceRange.max > 0 && (
              <Typography variant="caption" color="text.secondary">
                Khoảng giá dữ liệu: {filterOptions.priceRange.min.toLocaleString('vi-VN')}–{filterOptions.priceRange.max.toLocaleString('vi-VN')} ₫
              </Typography>
            )}
          </Stack>
        </Paper>

        <Stack spacing={3}>
          <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems={{sm: 'center'}} justifyContent="space-between">
            <Typography fontWeight={700}>{meta.totalItems} sản phẩm</Typography>
            <FormControl size="small" sx={{minWidth: 190}}>
              <InputLabel id="sort-label">Sắp xếp</InputLabel>
              <Select labelId="sort-label" label="Sắp xếp" value={query.sort} onChange={event => changeSort(event.target.value)}>
                {sortOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <Divider/>
          {error && <Alert severity="error">{error}</Alert>}
          {loading && (
            <Box sx={{display: 'grid', minHeight: 320, placeItems: 'center'}}>
              <CircularProgress aria-label="Đang tải sản phẩm"/>
            </Box>
          )}
          {!loading && !error && products.length === 0 && (
            <Alert severity="info">Không tìm thấy sản phẩm phù hợp. Hãy thử xóa bớt bộ lọc.</Alert>
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
              showFirstButton
              showLastButton
              disabled={loading}
            />
            <Typography variant="caption" color="text.secondary">
              Trang {Math.min(query.page, Math.max(1, meta.totalPages))} / {Math.max(1, meta.totalPages)}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
