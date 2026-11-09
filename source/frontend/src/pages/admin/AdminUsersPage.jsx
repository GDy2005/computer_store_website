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
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

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

function UserActions({account, currentUser, onEdit, onBan, t}) {
  const protectedAccount = account.role === 'ADMIN' || entityId(account) === entityId(currentUser);
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Button size="small" variant="outlined" onClick={() => onEdit(account)}>{t('admin.common.edit')}</Button>
      <Tooltip title={protectedAccount ? t('admin.users.protected') : ''}>
        <span>
          <Button
            size="small"
            color={account.isBanned ? 'success' : 'error'}
            disabled={protectedAccount}
            onClick={() => onBan(account)}
          >
            {account.isBanned ? t('admin.users.unban') : t('admin.users.ban')}
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}

export default function AdminUsersPage() {
  const {locale, t} = useLanguage();
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
        const message = adminErrorMessage(requestError, t('admin.users.loadError'));
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
      setNotice(t('admin.users.updated'));
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, t('admin.users.updateError')));
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
      setNotice(nextState ? t('admin.users.bannedNotice') : t('admin.users.unbannedNotice'));
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, nextState ? t('admin.users.banError') : t('admin.users.unbanError')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={t('admin.users.title')}
        description={t('admin.users.description')}
      />
      <Paper component="form" onSubmit={applyFilters} variant="outlined" sx={{p: 2}}>
        <Stack direction={{xs: 'column', lg: 'row'}} spacing={2}>
          <TextField
            label={t('admin.users.search')}
            value={draft.search}
            onChange={event => setDraft(current => ({...current, search: event.target.value}))}
            fullWidth
            inputProps={{maxLength: 100}}
          />
          <FormControl sx={{minWidth: 170}}>
            <InputLabel id="user-ban-filter">{t('admin.users.banFilter')}</InputLabel>
            <Select labelId="user-ban-filter" label={t('admin.users.banFilter')} value={draft.isBanned} onChange={event => setDraft(current => ({...current, isBanned: event.target.value}))}>
              <MenuItem value="">{t('admin.common.all')}</MenuItem>
              <MenuItem value="false">{t('admin.users.active')}</MenuItem>
              <MenuItem value="true">{t('admin.users.banned')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{minWidth: 190}}>
            <InputLabel id="user-status-filter">{t('admin.users.activation')}</InputLabel>
            <Select labelId="user-status-filter" label={t('admin.users.activation')} value={draft.accountStatus} onChange={event => setDraft(current => ({...current, accountStatus: event.target.value}))}>
              <MenuItem value="">{t('admin.common.all')}</MenuItem>
              <MenuItem value="ACTIVE">{t('admin.users.activated')}</MenuItem>
              <MenuItem value="PENDING_ACTIVATION">{t('admin.users.pendingActivation')}</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained">{t('admin.common.filter')}</Button>
          <Button type="button" color="inherit" onClick={() => setParams({})}>{t('admin.common.clearFilters')}</Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <AdminLoading label={t('admin.users.loading')}/>}
      {!loading && !error && result.items.length === 0 && <AdminEmpty>{t('admin.users.empty')}</AdminEmpty>}
      {!loading && result.items.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{display: {xs: 'none', md: 'block'}}}>
            <Table aria-label={t('admin.users.listAria')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.users.user')}</TableCell>
                  <TableCell>{t('admin.users.role')}</TableCell>
                  <TableCell>{t('admin.users.activation')}</TableCell>
                  <TableCell>{t('admin.common.status')}</TableCell>
                  <TableCell>{t('admin.users.createdAt')}</TableCell>
                  <TableCell align="right">{t('admin.common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.items.map(account => (
                  <TableRow key={entityId(account)} hover>
                    <TableCell>
                      <Typography fontWeight={800}>{account.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">{account.email}</Typography>
                      <Typography variant="caption" color="text.secondary">{account.phone || t('admin.users.noPhone')}</Typography>
                    </TableCell>
                    <TableCell>{account.role === 'ADMIN' ? t('admin.users.admin') : t('admin.users.customer')}</TableCell>
                    <TableCell><Chip size="small" label={account.accountStatus === 'ACTIVE' ? t('admin.users.activated') : t('admin.users.pendingActivation')} color={account.accountStatus === 'ACTIVE' ? 'success' : 'warning'}/></TableCell>
                    <TableCell><Chip size="small" label={account.isBanned ? t('admin.users.bannedShort') : t('admin.users.normal')} color={account.isBanned ? 'error' : 'default'}/></TableCell>
                    <TableCell>{formatAdminDate(account.createdAt, {dateOnly: true, locale})}</TableCell>
                    <TableCell align="right"><UserActions account={account} currentUser={currentUser} onEdit={openEdit} onBan={setPendingBan} t={t}/></TableCell>
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
                    <Chip size="small" label={account.role === 'ADMIN' ? t('admin.users.admin') : t('admin.users.customer')}/>
                    <Chip size="small" label={account.accountStatus === 'ACTIVE' ? t('admin.users.activated') : t('admin.users.pendingActivation')} color={account.accountStatus === 'ACTIVE' ? 'success' : 'warning'}/>
                    {account.isBanned && <Chip size="small" color="error" label={t('admin.users.bannedShort')}/>}
                  </Stack>
                  <Typography variant="body2">{t('admin.users.phone')}: {account.phone || '—'} · {t('admin.users.created', {date: formatAdminDate(account.createdAt, {dateOnly: true, locale})})}</Typography>
                  <UserActions account={account} currentUser={currentUser} onEdit={openEdit} onBan={setPendingBan} t={t}/>
                </Stack>
              </Paper>
            ))}
          </Stack>
          <AdminPagination meta={result.meta} page={query.page} onChange={changePage}/>
        </>
      )}

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <Box component="form" onSubmit={saveUser}>
          <DialogTitle>{t('admin.users.editTitle')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{pt: 1}}>
              <TextField label="Email" value={editing?.email || ''} disabled/>
              <TextField label={t('admin.users.fullName')} value={editForm.fullName} onChange={event => setEditForm(current => ({...current, fullName: event.target.value}))} required inputProps={{maxLength: 100}}/>
              <TextField label={t('admin.users.phoneNumber')} value={editForm.phone} onChange={event => setEditForm(current => ({...current, phone: event.target.value}))} inputProps={{maxLength: 20}}/>
              <Alert severity="info">{t('admin.users.readonlyNotice')}</Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={saving}>{t('admin.common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={saving}>{saving ? t('admin.common.saving') : t('admin.common.save')}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(pendingBan)} onClose={() => !saving && setPendingBan(null)}>
        <DialogTitle>{pendingBan?.isBanned ? t('admin.users.unbanTitle') : t('admin.users.banTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {pendingBan?.isBanned
              ? t('admin.users.unbanConfirm', {name: pendingBan?.fullName})
              : t('admin.users.banConfirm', {name: pendingBan?.fullName})}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingBan(null)} disabled={saving}>{t('admin.common.back')}</Button>
          <Button color={pendingBan?.isBanned ? 'success' : 'error'} variant="contained" onClick={confirmBan} disabled={saving}>
            {saving ? t('admin.common.processing') : pendingBan?.isBanned ? t('admin.users.unban') : t('admin.users.banAccount')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
