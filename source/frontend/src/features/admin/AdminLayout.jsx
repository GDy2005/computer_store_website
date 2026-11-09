import {useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography
} from '@mui/material';
import {Link, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import {useAuth} from '../auth/AuthContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

const adminNavigation = t => [
  {label: t('admin.nav.dashboard'), to: '/admin', icon: 'dashboard'},
  {label: t('admin.nav.products'), to: '/admin/products', icon: 'package'},
  {label: t('admin.nav.categories'), to: '/admin/categories', icon: 'grid'},
  {label: t('admin.nav.users'), to: '/admin/users', icon: 'people'},
  {label: t('admin.nav.orders'), to: '/admin/orders', icon: 'receipt'},
  {label: t('admin.nav.coupons'), to: '/admin/coupons', icon: 'coupon'}
];

function isSelected(pathname, to) {
  return to === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(to);
}

function AdminNavigation({pathname, onNavigate, t}) {
  return (
    <List component="nav" aria-label={t('admin.nav.aria')} sx={{px: 1.5, py: 1}}>
      {adminNavigation(t).map(item => (
        <ListItemButton
          key={item.to}
          component={Link}
          to={item.to}
          selected={isSelected(pathname, item.to)}
          onClick={onNavigate}
          sx={{
            position: 'relative',
            borderRadius: '9px',
            mb: 0.65,
            minHeight: 48,
            px: 1.75,
            color: 'rgba(255,255,255,.72)',
            transition: 'background-color 160ms ease, color 160ms ease, transform 160ms ease',
            '&:hover': {bgcolor: 'rgba(255,255,255,.08)', color: 'common.white', transform: 'translateX(2px)'},
            '&.Mui-selected': {
              bgcolor: 'secondary.main',
              color: '#151515',
              boxShadow: '0 7px 18px rgba(246,173,50,.2)'
            },
            '&.Mui-selected:hover': {bgcolor: 'secondary.dark', color: '#151515'}
          }}
        >
          <UiIcon name={item.icon} sx={{fontSize: 20, mr: 1.4}}/>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{fontWeight: isSelected(pathname, item.to) ? 800 : 600}}
          />
        </ListItemButton>
      ))}
    </List>
  );
}

function AdminLanguageSwitch({locale, setLocale, t}) {
  return (
    <Box sx={{px: 2.5, py: 1.75}}>
      <Stack direction="row" alignItems="center" spacing={0.9} sx={{mb: 1}}>
        <UiIcon name="globe" sx={{fontSize: 18, color: 'rgba(255,255,255,.55)'}}/>
        <Typography variant="caption" fontWeight={800} color="rgba(255,255,255,.62)">
          {t('nav.language')}
        </Typography>
      </Stack>
      <Box
        role="group"
        aria-label={t('nav.language')}
        sx={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, p: 0.45, borderRadius: '9px', bgcolor: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)'}}
      >
        {['vi', 'en'].map(value => (
          <Button
            key={value}
            size="small"
            aria-pressed={locale === value}
            onClick={() => setLocale(value)}
            sx={{
              minHeight: 34,
              borderRadius: '7px',
              color: locale === value ? '#151515' : 'rgba(255,255,255,.65)',
              bgcolor: locale === value ? 'secondary.main' : 'transparent',
              '&:hover': {bgcolor: locale === value ? 'secondary.dark' : 'rgba(255,255,255,.08)', color: locale === value ? '#151515' : 'common.white'}
            }}
          >
            {value.toUpperCase()}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function AdminSidebar({pathname, onNavigate, onSignOut, t, user, locale, setLocale}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: 'common.white',
        background: 'linear-gradient(180deg, #17241f 0%, #1d2421 48%, #171a19 100%)'
      }}
    >
      <Box sx={{px: 2.5, pt: 2.75, pb: 2.25}}>
        <Stack direction="row" spacing={1.4} alignItems="center">
          <Box
            sx={{
              display: 'grid',
              width: 46,
              height: 46,
              flexShrink: 0,
              placeItems: 'center',
              borderRadius: '11px 11px 11px 3px',
              bgcolor: 'secondary.main',
              color: '#151515',
              fontWeight: 950,
              boxShadow: '0 8px 22px rgba(246,173,50,.2)'
            }}
          >
            CS
          </Box>
          <Box sx={{minWidth: 0}}>
            <Typography fontWeight={950} letterSpacing=".035em" noWrap>COMPUTER STORE</Typography>
            <Typography color="rgba(255,255,255,.52)" variant="caption">{t('admin.common.area')}</Typography>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{borderColor: 'rgba(255,255,255,.09)'}}/>
      <Typography variant="overline" sx={{px: 3.25, pt: 2.1, pb: 0.55, color: 'rgba(255,255,255,.38)', fontWeight: 850, letterSpacing: '.12em'}}>
        {t('admin.common.eyebrow')}
      </Typography>
      <Box sx={{flexGrow: 1, minHeight: 0, overflowY: 'auto'}}>
        <AdminNavigation pathname={pathname} onNavigate={onNavigate} t={t}/>
      </Box>

      <Box sx={{mt: 'auto'}}>
        <Divider sx={{borderColor: 'rgba(255,255,255,.09)'}}/>
        <AdminLanguageSwitch locale={locale} setLocale={setLocale} t={t}/>
        <Divider sx={{borderColor: 'rgba(255,255,255,.09)'}}/>
        <Box sx={{p: 1.5}}>
          <Box sx={{px: 1.25, pt: 0.75, pb: 1.25}}>
            <Typography variant="body2" fontWeight={800} noWrap>{user?.fullName || user?.email || t('admin.common.center')}</Typography>
            {user?.email && user?.fullName && <Typography variant="caption" color="rgba(255,255,255,.48)" noWrap>{user.email}</Typography>}
          </Box>
          <Button
            color="inherit"
            fullWidth
            onClick={onSignOut}
            startIcon={<UiIcon name="logout" sx={{fontSize: 20}}/>}
            sx={{justifyContent: 'flex-start', minHeight: 43, px: 1.25, color: 'rgba(255,255,255,.72)', '&:hover': {bgcolor: 'rgba(255,255,255,.08)', color: 'common.white'}}}
          >
            {t('nav.logout')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default function AdminLayout() {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const {locale, setLocale, t} = useLanguage();
  const {logout, user} = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function signOut() {
    try {
      setLogoutError('');
      await logout();
      setMobileOpen(false);
      navigate('/login', {replace: true});
    } catch {
      setLogoutError(t('admin.logoutError'));
    }
  }

  return (
    <Box sx={{minHeight: '100vh', bgcolor: '#f4f6f3'}}>
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{keepMounted: true}}
        slotProps={{paper: {sx: {width: 286, border: 0, bgcolor: '#17241f'}}}}
      >
        <AdminSidebar
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          onSignOut={signOut}
          t={t}
          user={user}
          locale={locale}
          setLocale={setLocale}
        />
      </Drawer>

      <Box
        component="aside"
        sx={{
          display: {xs: 'none', md: 'block'},
          position: 'fixed',
          inset: '0 auto 0 0',
          zIndex: theme => theme.zIndex.drawer,
          width: 276,
          boxShadow: '10px 0 34px rgba(18,35,27,.1)'
        }}
      >
        <AdminSidebar pathname={pathname} onSignOut={signOut} t={t} user={user} locale={locale} setLocale={setLocale}/>
      </Box>

      <Box sx={{ml: {md: '276px'}, minWidth: 0, minHeight: '100vh'}}>
        <Box
          sx={{
            display: {xs: 'flex', md: 'none'},
            position: 'sticky',
            top: 0,
            zIndex: theme => theme.zIndex.appBar,
            minHeight: 68,
            px: 2,
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'rgba(255,255,255,.94)',
            borderBottom: '1px solid rgba(25,55,43,.12)',
            backdropFilter: 'blur(14px)'
          }}
        >
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={850}>{t('admin.common.eyebrow')}</Typography>
            <Typography fontWeight={900} sx={{mt: -0.45}}>{t('admin.common.center')}</Typography>
          </Box>
          <Button variant="outlined" onClick={() => setMobileOpen(true)}>{t('admin.common.openMenu')}</Button>
        </Box>

        <Box
          sx={{
            width: '100%',
            maxWidth: 1540,
            mx: 'auto',
            p: {xs: 2, sm: 3, lg: 4},
            '& .MuiPaper-root:not(.MuiDrawer-paper)': {
              borderColor: 'rgba(24, 58, 44, .12)',
              borderRadius: '12px'
            },
            '& .MuiTableContainer-root': {borderRadius: '9px'},
            '& .MuiTableHead-root .MuiTableCell-root': {
              bgcolor: '#eef2ef',
              color: '#33413b',
              fontWeight: 850,
              borderBottomColor: 'rgba(24,58,44,.13)'
            },
            '& .MuiTableBody-root .MuiTableRow-root': {
              transition: 'background-color 140ms ease'
            },
            '& .MuiTableBody-root .MuiTableRow-root:hover': {bgcolor: 'rgba(28,75,57,.035)'},
            '& .MuiOutlinedInput-root': {bgcolor: 'rgba(255,255,255,.86)'}
          }}
        >
          {logoutError && <Alert severity="error" sx={{mb: 2}}>{logoutError}</Alert>}
          <Outlet/>
        </Box>
      </Box>
    </Box>
  );
}
