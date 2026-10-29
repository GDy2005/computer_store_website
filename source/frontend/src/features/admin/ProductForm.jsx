import {useEffect, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {
  adminErrorMessage,
  createAdminProduct,
  fetchAdminCategories,
  fetchAdminProduct,
  updateAdminProduct,
  uploadAdminProductImages
} from './adminApi.js';
import {AdminLoading, AdminPageHeader} from './AdminUi.jsx';

function makeVariant(values = {}) {
  return {
    clientId: crypto.randomUUID(),
    sku: values.sku || '',
    name: values.name || '',
    attributesText: JSON.stringify(values.attributes || {}, null, 2),
    price: values.price ?? '',
    costPrice: values.costPrice ?? '',
    stock: values.stock ?? '',
    reservedStock: Number(values.reservedStock || 0),
    isActive: values.isActive !== false
  };
}

const emptyProduct = {
  name: '',
  slug: '',
  brand: '',
  categoryId: '',
  tagsText: '',
  shortDescription: '',
  description: '',
  images: [],
  variants: [makeVariant(), makeVariant()],
  isActive: true
};

function normalizeProduct(product) {
  return {
    name: product.name || '',
    slug: product.slug || '',
    brand: product.brand || '',
    categoryId: product.categoryId?._id || product.categoryId?.id || product.categoryId || '',
    tagsText: (product.tags || []).join(', '),
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    images: (product.images || []).map(image => ({...image})),
    variants: (product.variants || []).map(makeVariant),
    isActive: product.isActive !== false
  };
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function integer(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`${label} phải là số nguyên không âm.`);
  }
  return number;
}

function parseAttributes(text, index) {
  let attributes;
  try {
    attributes = JSON.parse(text || '{}');
  } catch {
    throw new Error(`Thuộc tính biến thể ${index + 1} phải là JSON hợp lệ.`);
  }

  if (!attributes || Array.isArray(attributes) || typeof attributes !== 'object') {
    throw new Error(`Thuộc tính biến thể ${index + 1} phải là một object JSON.`);
  }

  const invalid = Object.entries(attributes).some(([key, value]) =>
    !key.trim() || typeof value !== 'string' || !value.trim()
  );
  if (invalid) {
    throw new Error(`Tên và giá trị thuộc tính biến thể ${index + 1} phải là chuỗi không rỗng.`);
  }
  return attributes;
}

export default function ProductForm() {
  const {id} = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProduct);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchAdminCategories({signal: controller.signal}),
      editing ? fetchAdminProduct(id, {signal: controller.signal}) : Promise.resolve(null)
    ])
      .then(([categoryItems, product]) => {
        setCategories(categoryItems);
        if (product) setForm(normalizeProduct(product));
      })
      .catch(requestError => {
        const message = adminErrorMessage(requestError, 'Không thể tải dữ liệu sản phẩm.');
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [editing, id]);

  function update(field, value) {
    setForm(current => ({...current, [field]: value}));
  }

  function updateImage(index, field, value) {
    setForm(current => ({
      ...current,
      images: current.images.map((image, imageIndex) =>
        imageIndex === index ? {...image, [field]: value} : image
      )
    }));
  }

  function removeImage(index) {
    setForm(current => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index)
    }));
  }

  function updateVariant(clientId, field, value) {
    setForm(current => ({
      ...current,
      variants: current.variants.map(variant =>
        variant.clientId === clientId ? {...variant, [field]: value} : variant
      )
    }));
  }

  function addVariant() {
    if (form.variants.length >= 30) return;
    update('variants', [...form.variants, makeVariant()]);
  }

  function removeVariant(clientId) {
    if (form.variants.length <= 2) {
      setError('Sản phẩm phải có ít nhất hai biến thể.');
      return;
    }
    update('variants', form.variants.filter(variant => variant.clientId !== clientId));
  }

  async function uploadImages(event) {
    const input = event.target;
    const selected = Array.from(input.files || []);
    input.value = '';
    if (!selected.length) return;

    const remaining = 10 - form.images.length;
    if (remaining <= 0) {
      setError('Một sản phẩm chỉ được có tối đa 10 ảnh.');
      return;
    }

    const files = selected.slice(0, Math.min(6, remaining));
    if (files.length < selected.length) {
      setNotice(`Chỉ tải ${files.length} ảnh để không vượt giới hạn 6 ảnh/lần và 10 ảnh/sản phẩm.`);
    }

    setUploading(true);
    setError('');
    try {
      const images = await uploadAdminProductImages(files);
      setForm(current => ({...current, images: [...current.images, ...images].slice(0, 10)}));
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Không thể tải ảnh lên Cloudinary.'));
    } finally {
      setUploading(false);
    }
  }

  function payload() {
    if (form.images.length < 3 || form.images.length > 10) {
      throw new Error('Sản phẩm phải có từ 3 đến 10 ảnh.');
    }
    if (form.variants.length < 2 || form.variants.length > 30) {
      throw new Error('Sản phẩm phải có từ 2 đến 30 biến thể.');
    }
    if (form.images.some(image => !image.alt?.trim())) {
      throw new Error('Mỗi ảnh phải có mô tả thay thế.');
    }

    const variants = form.variants.map((variant, index) => {
      const stock = integer(variant.stock, `Tồn kho biến thể ${index + 1}`);
      if (stock < variant.reservedStock) {
        throw new Error(`Tồn kho biến thể ${index + 1} không được thấp hơn ${variant.reservedStock} sản phẩm đang giữ.`);
      }
      return {
        sku: variant.sku.trim().toUpperCase(),
        name: variant.name.trim(),
        attributes: parseAttributes(variant.attributesText, index),
        price: integer(variant.price, `Giá bán biến thể ${index + 1}`),
        costPrice: integer(variant.costPrice, `Giá vốn biến thể ${index + 1}`),
        stock,
        isActive: variant.isActive
      };
    });

    return {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      brand: form.brand.trim(),
      categoryId: form.categoryId,
      tags: [...new Set(form.tagsText.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))],
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      images: form.images.map(image => ({url: image.url, publicId: image.publicId, alt: image.alt.trim()})),
      variants,
      isActive: form.isActive
    };
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    let data;
    try {
      data = payload();
    } catch (validationError) {
      setError(validationError.message);
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }

    setSaving(true);
    try {
      if (editing) await updateAdminProduct(id, data);
      else await createAdminProduct(data);
      navigate('/admin/products', {
        replace: true,
        state: {notice: editing ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.'}
      });
    } catch (requestError) {
      setError(adminErrorMessage(requestError, editing ? 'Không thể cập nhật sản phẩm.' : 'Không thể tạo sản phẩm.'));
      window.scrollTo({top: 0, behavior: 'smooth'});
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminLoading label="Đang tải trình chỉnh sửa sản phẩm"/>;

  return (
    <Stack component="form" onSubmit={submit} spacing={3}>
      <AdminPageHeader
        title={editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        description="Thông tin giá và tồn kho luôn được backend kiểm tra lại trước khi lưu."
        action={<Button component={Link} to="/admin/products" color="inherit">← Danh sách sản phẩm</Button>}
      />
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="info" onClose={() => setNotice('')}>{notice}</Alert>}

      <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
        <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Thông tin chung</Typography>
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))'}, gap: 2}}>
          <TextField label="Tên sản phẩm" value={form.name} onChange={event => update('name', event.target.value)} required inputProps={{maxLength: 200}}/>
          <TextField label="Thương hiệu" value={form.brand} onChange={event => update('brand', event.target.value)} required inputProps={{maxLength: 100}}/>
          <Stack direction="row" spacing={1}>
            <TextField label="Slug" value={form.slug} onChange={event => update('slug', event.target.value)} required fullWidth inputProps={{maxLength: 200}}/>
            <Button type="button" variant="outlined" onClick={() => update('slug', slugify(form.name))}>Tạo slug</Button>
          </Stack>
          <FormControl required>
            <InputLabel id="product-category-label">Danh mục</InputLabel>
            <Select labelId="product-category-label" label="Danh mục" value={form.categoryId} onChange={event => update('categoryId', event.target.value)}>
              {categories.filter(category => category.isActive || String(category._id || category.id) === String(form.categoryId)).map(category => (
                <MenuItem key={category._id || category.id} value={category._id || category.id}>{category.name}{category.isActive ? '' : ' (đã ẩn)'}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Tags (phân cách bằng dấu phẩy)" value={form.tagsText} onChange={event => update('tagsText', event.target.value)} inputProps={{maxLength: 600}}/>
          <TextField label="Mô tả ngắn" value={form.shortDescription} onChange={event => update('shortDescription', event.target.value)} required multiline minRows={2} inputProps={{maxLength: 300}} sx={{gridColumn: {md: '1 / -1'}}}/>
          <TextField label="Mô tả chi tiết" value={form.description} onChange={event => update('description', event.target.value)} required multiline minRows={7} inputProps={{maxLength: 5000}} sx={{gridColumn: {md: '1 / -1'}}}/>
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={event => update('isActive', event.target.checked)}/>}
            label="Đang bán"
          />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
        <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={2} mb={2}>
          <Box>
            <Typography component="h2" variant="h6" fontWeight={850}>Hình ảnh</Typography>
            <Typography variant="body2" color="text.secondary">Bắt buộc 3–10 ảnh HTTPS. Mỗi lượt chọn tối đa 6 ảnh, 5 MB/ảnh.</Typography>
          </Box>
          <Button component="label" variant="outlined" disabled={uploading || form.images.length >= 10}>
            {uploading ? 'Đang tải ảnh…' : 'Tải ảnh lên'}
            <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={uploadImages}/>
          </Button>
        </Stack>
        {form.images.length === 0 && <Alert severity="info">Chưa có ảnh sản phẩm.</Alert>}
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)'}, gap: 2}}>
          {form.images.map((image, index) => (
            <Paper key={`${image.publicId}-${index}`} variant="outlined" sx={{p: 1.5}}>
              <Box component="img" src={image.url} alt={image.alt || ''} sx={{width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', bgcolor: 'background.default', borderRadius: 1}}/>
              <TextField
                label={`Mô tả ảnh ${index + 1}`}
                value={image.alt || ''}
                onChange={event => updateImage(index, 'alt', event.target.value)}
                fullWidth
                size="small"
                required
                inputProps={{maxLength: 200}}
                sx={{mt: 1.5}}
              />
              <Button type="button" color="error" size="small" onClick={() => removeImage(index)} sx={{mt: 1}}>Xóa ảnh</Button>
            </Paper>
          ))}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
        <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={2} mb={2}>
          <Box>
            <Typography component="h2" variant="h6" fontWeight={850}>Biến thể & tồn kho</Typography>
            <Typography variant="body2" color="text.secondary">Bắt buộc ít nhất hai biến thể. SKU phải duy nhất toàn hệ thống.</Typography>
          </Box>
          <Button type="button" variant="outlined" onClick={addVariant} disabled={form.variants.length >= 30}>Thêm biến thể</Button>
        </Stack>
        <Stack spacing={2.5} divider={<Divider flexItem/>}>
          {form.variants.map((variant, index) => (
            <Box key={variant.clientId}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={850}>Biến thể {index + 1}</Typography>
                  {variant.reservedStock > 0 && <Chip size="small" color="warning" label={`${variant.reservedStock} đang giữ`}/>} 
                </Stack>
                <Button type="button" color="error" size="small" onClick={() => removeVariant(variant.clientId)} disabled={form.variants.length <= 2}>Xóa</Button>
              </Stack>
              <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))'}, gap: 2}}>
                <TextField label="SKU" value={variant.sku} onChange={event => updateVariant(variant.clientId, 'sku', event.target.value.toUpperCase())} required inputProps={{maxLength: 100}}/>
                <TextField label="Tên biến thể" value={variant.name} onChange={event => updateVariant(variant.clientId, 'name', event.target.value)} required inputProps={{maxLength: 150}}/>
                <FormControlLabel control={<Switch checked={variant.isActive} onChange={event => updateVariant(variant.clientId, 'isActive', event.target.checked)}/>} label="Đang bán"/>
                <TextField label="Giá bán (₫)" type="number" value={variant.price} onChange={event => updateVariant(variant.clientId, 'price', event.target.value)} required inputProps={{min: 0, step: 1000}}/>
                <TextField label="Giá vốn (₫)" type="number" value={variant.costPrice} onChange={event => updateVariant(variant.clientId, 'costPrice', event.target.value)} required inputProps={{min: 0, step: 1000}}/>
                <TextField helperText={variant.reservedStock ? `Không được thấp hơn ${variant.reservedStock} đang giữ` : 'Tổng tồn kho hiện tại'} label="Tồn kho" type="number" value={variant.stock} onChange={event => updateVariant(variant.clientId, 'stock', event.target.value)} required inputProps={{min: variant.reservedStock, step: 1}}/>
                <TextField
                  label="Thuộc tính (JSON)"
                  value={variant.attributesText}
                  onChange={event => updateVariant(variant.clientId, 'attributesText', event.target.value)}
                  multiline
                  minRows={3}
                  helperText={'Ví dụ: {"RAM":"16GB","SSD":"512GB"}'}
                  sx={{gridColumn: {md: '1 / -1'}}}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Stack direction={{xs: 'column-reverse', sm: 'row'}} justifyContent="flex-end" spacing={2}>
        <Button component={Link} to="/admin/products" color="inherit" size="large">Hủy</Button>
        <Button type="submit" variant="contained" size="large" disabled={saving || uploading}>
          {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
        </Button>
      </Stack>
    </Stack>
  );
}
