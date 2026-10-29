import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {useSearchParams} from 'react-router-dom';
import {useAuth} from '../../features/auth/AuthContext.jsx';
import {
  adminErrorMessage,
  fetchAdminUsers,
  setAdminUserBan,
  updateAdminUser
} from '../../features/admin/adminApi.js';
import {
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminPagination
} from '../../features/admin/AdminUi.jsx';
import {entityId, formatAdminDate} from '../../features/admin/adminFormat.js';

function readQuery(params) {
  const page = Number(params.get('page') || 1);
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    limit: 20,
    search: params.get('search') || '',
    isBanned: params.get('isBanned') || '',
    accountStatus: params.get('accountStatus') || ''
  };
}

const accountLabels = {
  ACTIVE: 'Đã kích hoạt',
  PENDING_ACTIVATION: 'Chờ kích hoạt'
};

function UserActions({account, currentUser, onEdit, onBan}) {
  const protectedAccount = account.role === 'ADMIN' || entityId(account) === entityId(currentUser);
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button size="small" variant="outlined" onClick={() => onEdit(account)}>Chỉnh sửa</Button>
      <Tooltip title={protectedAccount ? 'Không thể ban tài khoản quản trị.' : ''}>
        <span>
          <Button
            size="small"
            color={account.isBanned ? 'success' : 'error'}
            disabled={protectedAccount}
            onClick={() => onBan(account)}
          >
            {account.isBanned ? 'Bỏ ban' : 'Ban'}
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}

export default function AdminUsersPage() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const {user: currentUser} = useAuth();
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const query = useMemo(() => readQuery(params), [paramsKey]);
  const [draft, setDraft] = useState({search: query.search, isBanned: query.isBanned, accountStatus: query.accountStatus});
  const [result, setResult] = useState({items: [], meta: {totalPages: 1, totalItems: 0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({fullName: '', phone: ''});
  const [pendingBan, setPendingBan] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({search: query.search, isBanned: query.isBanned, accountStatus: query.accountStatus});
  }, [paramsKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAdminUsers(query, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        const message = adminErrorMessage(requestError, 'Không thể tải danh sách người dùng.');
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [paramsKey, refreshKey]);

  function applyFilters(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (draft.search.trim()) next.set('search', draft.search.trim());
    if (draft.isBanned !== '') next.set('isBanned', draft.isBanned);
    if (draft.accountStatus) next.set('accountStatus', draft.accountStatus);
    setParams(next);
  }

  function changePage(_, page) {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setParams(next);
  }

  function openEdit(account) {
    setEditing(account);
    setEditForm({fullName: account.fullName || '', phone: account.phone || ''});
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateAdminUser(entityId(editing), {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || null
      });
      setEditing(null);
      setNotice('Đã cập nhật thông tin người dùng.');
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Không thể cập nhật người dùng.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmBan() {
    if (!pendingBan) return;
    const nextState = !pendingBan.isBanned;
    setSaving(true);
    setError('');
    try {
      await setAdminUserBan(entityId(pendingBan), nextState);
      setPendingBan(null);
      setNotice(nextState ? 'Đã ban tài khoản.' : 'Đã bỏ ban tài khoản.');
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, nextState ? 'Không thể ban tài khoản.' : 'Không thể bỏ ban tài khoản.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Người dùng"
        description="Chỉnh sửa thông tin cơ bản và ban hoặc bỏ ban tài khoản khách hàng."
      />
      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Stack direction={{xs: 'column', lg: 'row'}} spacing={2}>
          <TextField
            label="Tên hoặc email"
            value={draft.search}
            onChange={event => setDraft(current => ({...current, search: event.target.value}))}
            fullWidth
            inputProps={{maxLength: 100}}
          />
          <FormControl sx={{minWidth: 170}}>
            <InputLabel id="user-ban-filter">Ban</InputLabel>
            <Select labelId="user-ban-filter" label="Ban" value={draft.isBanned} onChange={event => setDraft(current => ({...current, isBanned: event.target.value}))}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="false">Đang hoạt động</MenuItem>
              <MenuItem value="true">Đã bị ban</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{minWidth: 190}}>
            <InputLabel id="user-status-filter">Kích hoạt</InputLabel>
            <Select labelId="user-status-filter" label="Kích hoạt" value={draft.accountStatus} onChange={event => setDraft(current => ({...current, accountStatus: event.target.value}))}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="ACTIVE">Đã kích hoạt</MenuItem>
              <MenuItem value="PENDING_ACTIVATION">Chờ kích hoạt</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained">Lọc</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>Xóa lọc</Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label="Đang tải người dùng"/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>Không tìm thấy người dùng phù hợp.</AdminEmpty>}
      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', md: 'block'}}}>
            <Table aria-label="Danh sách người dùng">
              <TableHead>
                <TableRow>
                  <TableCell>Người dùng</TableCell>
                  <TableCell>Vai trò</TableCell>
                  <TableCell>Kích hoạt</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(account => (
                  <TableRow key={entityId(account)} hover>
                    <TableCell>
                      <Typography fontWeight={800}>{account.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">{account.email}</Typography>
                      <Typography variant="caption" color="text.secondary">{account.phone || 'Chưa có số điện thoại'}</Typography>
                    </TableCell>
                    <TableCell>{account.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}</TableCell>
                    <TableCell><Chip size="small" label={accountLabels[account.accountStatus] || account.accountStatus} color={account.accountStatus === 'ACTIVE' ? 'success' : 'warning'}/></TableCell>
                    <TableCell><Chip size="small" label={account.isBanned ? 'Đã ban' : 'Bình thường'} color={account.isBanned ? 'error' : 'default'}/></TableCell>
                    <TableCell>{formatAdminDate(account.createdAt, {dateOnly: true})}</TableCell>
                    <TableCell align="right"><UserActions account={account} currentUser={currentUser} onEdit={openEdit} onBan={setPendingBan}/></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack spacing={2} sx={{display: {xs: 'flex', md: 'none'}}}>
            {result.items.map(account => (
              <Paper key={entityId(account)} variant="outlined" sx={{p: 2.25}}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography fontWeight={850}>{account.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">{account.email}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={account.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}/>
                    <Chip size="small" label={accountLabels[account.accountStatus] || account.accountStatus} color={account.accountStatus === 'ACTIVE' ? 'success' : 'warning'}/>
                    {account.isBanned && <Chip size="small" color="error" label="Đã ban"/>}
                  </Stack>
                  <Typography variant="body2">Điện thoại: {account.phone || 'Chưa có'} · Tạo {formatAdminDate(account.createdAt, {dateOnly: true})}</Typography>
                  <UserActions account={account} currentUser={currentUser} onEdit={openEdit} onBan={setPendingBan}/>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <AdminPagination meta={result.meta} page={query.page} onChange={changePage}/>
        </>
      )}

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <Box component="form" onSubmit={saveUser}>
          <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{pt: 1}}>
              <TextField label="Email" value={editing?.email || ''} disabled/>
              <TextField label="Họ tên" value={editForm.fullName} onChange={event => setEditForm(current => ({...current, fullName: event.target.value}))} required inputProps={{maxLength: 100}}/>
              <TextField label="Số điện thoại" value={editForm.phone} onChange={event => setEditForm(current => ({...current, phone: event.target.value}))} inputProps={{maxLength: 20}}/>
              <Alert severity="info">Vai trò và email không được thay đổi tại màn hình này.</Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={saving}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(pendingBan)} onClose={() => !saving && setPendingBan(null)}>
        <DialogTitle>{pendingBan?.isBanned ? 'Bỏ ban tài khoản?' : 'Ban tài khoản?'}</DialogTitle>
        <DialogContent>
          <Typography>
            {pendingBan?.isBanned
              ? `Cho phép “${pendingBan?.fullName}” đăng nhập và sử dụng tài khoản trở lại?`
              : `“${pendingBan?.fullName}” sẽ không thể đăng nhập hoặc sử dụng các API yêu cầu tài khoản.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingBan(null)} disabled={saving}>Quay lại</Button>
          <Button color={pendingBan?.isBanned ? 'success' : 'error'} variant="contained" onClick={confirmBan} disabled={saving}>
            {saving ? 'Đang xử lý…' : pendingBan?.isBanned ? 'Bỏ ban' : 'Ban tài khoản'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
