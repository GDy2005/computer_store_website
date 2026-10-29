import {useEffect, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  adminErrorMessage,
  createAdminCategory,
  deactivateAdminCategory,
  fetchAdminCategories,
  updateAdminCategory
} from '../../features/admin/adminApi.js';
import {AdminEmpty, AdminLoading, AdminPageHeader} from '../../features/admin/AdminUi.jsx';
import {entityId} from '../../features/admin/adminFormat.js';

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  isFeatured: false,
  isActive: true
};

function slugify(value) {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState(null);

  async function load(signal) {
    setLoading(true);
    setError('');
    try {
      setCategories(await fetchAdminCategories({signal}));
    } catch (requestError) {
      const message = adminErrorMessage(requestError, 'Không thể tải danh mục.');
      if (message) setError(message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(category) {
    setEditing(category);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isFeatured: Boolean(category.isFeatured),
      isActive: category.isActive !== false
    });
    setFormOpen(true);
  }

  async function saveCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      isFeatured: form.isFeatured,
      isActive: form.isActive
    };

    try {
      if (editing) await updateAdminCategory(entityId(editing), payload);
      else await createAdminCategory(payload);
      setNotice(editing ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục.');
      setFormOpen(false);
      await load();
    } catch (requestError) {
      setError(adminErrorMessage(requestError, editing ? 'Không thể cập nhật danh mục.' : 'Không thể tạo danh mục.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate) return;
    setSaving(true);
    setError('');
    try {
      await deactivateAdminCategory(entityId(pendingDeactivate));
      setNotice(`Đã ẩn danh mục ${pendingDeactivate.name}.`);
      setPendingDeactivate(null);
      await load();
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Không thể ẩn danh mục. Hãy kiểm tra các sản phẩm đang hoạt động.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Danh mục"
        description="Danh mục chỉ có thể ngừng hoạt động khi không còn sản phẩm đang bán."
        action={<Button variant="contained" onClick={openCreate}>Thêm danh mục</Button>}
      />
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label="Đang tải danh mục"/>}
      {!loading && categories.length === 0 && <AdminEmpty>Chưa có danh mục.</AdminEmpty>}
      {!loading && categories.length > 0 && (
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))'}, gap: 2}}>
          {categories.map(category => (
            <Paper key={entityId(category)} variant="outlined" sx={{p: 2.5}}>
              <Stack spacing={1.5} height="100%">
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Box>
                    <Typography variant="h6" fontWeight={850}>{category.name}</Typography>
                    <Typography variant="caption" color="text.secondary">/{category.slug}</Typography>
                  </Box>
                  <Chip size="small" color={category.isActive ? 'success' : 'default'} label={category.isActive ? 'Hoạt động' : 'Đã ẩn'}/>
                </Stack>
                <Typography color="text.secondary" variant="body2" sx={{flexGrow: 1}}>{category.description}</Typography>
                {category.isFeatured && <Chip label="Nổi bật" color="secondary" size="small" sx={{alignSelf: 'flex-start'}}/>}
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" size="small" onClick={() => openEdit(category)}>Chỉnh sửa</Button>
                  {category.isActive && <Button color="error" size="small" onClick={() => setPendingDeactivate(category)}>Ẩn danh mục</Button>}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <Box component="form" onSubmit={saveCategory}>
          <DialogTitle>{editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{pt: 1}}>
              <TextField label="Tên danh mục" value={form.name} onChange={event => setForm(current => ({...current, name: event.target.value}))} required inputProps={{maxLength: 100}}/>
              <Stack direction="row" spacing={1}>
                <TextField label="Slug" value={form.slug} onChange={event => setForm(current => ({...current, slug: event.target.value}))} required fullWidth inputProps={{maxLength: 100}}/>
                <Button type="button" variant="outlined" onClick={() => setForm(current => ({...current, slug: slugify(current.name)}))}>Tạo slug</Button>
              </Stack>
              <TextField label="Mô tả" value={form.description} onChange={event => setForm(current => ({...current, description: event.target.value}))} required multiline minRows={4} inputProps={{maxLength: 500}}/>
              <TextField label="URL ảnh HTTPS (không bắt buộc)" value={form.imageUrl} onChange={event => setForm(current => ({...current, imageUrl: event.target.value}))} type="url" inputProps={{maxLength: 1000}}/>
              <FormControlLabel control={<Switch checked={form.isFeatured} onChange={event => setForm(current => ({...current, isFeatured: event.target.checked}))}/>} label="Hiển thị nổi bật"/>
              <FormControlLabel control={<Switch checked={form.isActive} onChange={event => setForm(current => ({...current, isActive: event.target.checked}))}/>} label="Đang hoạt động"/>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(pendingDeactivate)} onClose={() => !saving && setPendingDeactivate(null)}>
        <DialogTitle>Ẩn danh mục?</DialogTitle>
        <DialogContent>
          <Typography>Danh mục “{pendingDeactivate?.name}” sẽ không còn xuất hiện trong catalog.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeactivate(null)} disabled={saving}>Quay lại</Button>
          <Button color="error" variant="contained" onClick={confirmDeactivate} disabled={saving}>{saving ? 'Đang xử lý…' : 'Ẩn danh mục'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
