import {useState} from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import {Link, Outlet, useLocation} from 'react-router-dom';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

const adminNavigation = t => [
  {label: t('admin.nav.dashboard'), to: '/admin', icon: 'dashboard'},
  {label: t('admin.nav.products'), to: '/admin/products', icon: 'package'},
  {label: t('admin.nav.categories'), to: '/admin/categories', icon: 'grid'},
  {label: t('admin.nav.users'), to: '/admin/users', icon: 'people'},
  {label: t('admin.nav.orders'), to: '/admin/orders', icon: 'receipt'},
  {label: t('admin.nav.coupons'), to: '/admin/coupons', icon: 'coupon'},
  {label: t('admin.nav.system'), to: '/admin/system', icon: 'settings'}
];

function isSelected(pathname, to) {
  return to === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(to);
}

function AdminNavigation({pathname, onNavigate, t}) {
  return (
    <List component="nav" aria-label={t('admin.nav.aria')} sx={{p: 1.25}}>
      {adminNavigation(t).map(item => (
        <ListItemButton
          key={item.to}
          component={Link}
          to={item.to}
          selected={isSelected(pathname, item.to)}
          onClick={onNavigate}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            minHeight: 46,
            color: 'rgba(255,255,255,.72)',
            '&:hover': {bgcolor: 'rgba(255,255,255,.07)', color: 'common.white'},
            '&.Mui-selected': {bgcolor: 'secondary.main', color: '#151515'},
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

export default function AdminLayout() {
  const {pathname} = useLocation();
  const {t} = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Stack spacing={2.5}>
      <Paper
        variant="outlined"
        sx={{display: {xs: 'flex', md: 'none'}, p: 1.5, alignItems: 'center', justifyContent: 'space-between', boxShadow: 1}}
      >
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>{t('admin.common.eyebrow')}</Typography>
          <Typography fontWeight={850}>{t('admin.common.center')}</Typography>
        </Box>
        <Button variant="outlined" onClick={() => setMobileOpen(true)}>{t('admin.common.openMenu')}</Button>
      </Paper>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{keepMounted: true}}
        slotProps={{paper: {sx: {bgcolor: '#252930', color: 'common.white'}}}}
      >
        <Box sx={{width: 280, p: 2.25}} role="presentation">
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{display: 'grid', width: 38, height: 38, placeItems: 'center', borderRadius: '10px 10px 10px 3px', bgcolor: 'secondary.main', color: '#151515', fontWeight: 900}}>CS</Box>
            <Box>
              <Typography fontWeight={900}>COMPUTER STORE</Typography>
              <Typography color="rgba(255,255,255,.55)" variant="caption">{t('admin.common.area')}</Typography>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{borderColor: 'rgba(255,255,255,.1)'}}/>
        <AdminNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)} t={t}/>
      </Drawer>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: 'minmax(0, 1fr)', md: '260px minmax(0, 1fr)'}, gap: 3, alignItems: 'start'}}>
        <Paper
          variant="outlined"
          sx={{display: {xs: 'none', md: 'block'}, position: 'sticky', top: 132, overflow: 'hidden', bgcolor: '#202020', color: 'common.white', border: 0, boxShadow: '0 12px 34px rgba(0,0,0,.16)'}}
        >
          <Box sx={{p: 2.5, background: 'linear-gradient(135deg, rgba(246,173,50,.18), rgba(255,255,255,.03))'}}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box sx={{display: 'grid', width: 42, height: 42, placeItems: 'center', borderRadius: '10px 10px 10px 3px', bgcolor: 'secondary.main', color: '#151515', fontWeight: 900}}>CS</Box>
              <Box>
                <Typography variant="overline" color="rgba(255,255,255,.6)" fontWeight={850}>{t('admin.common.eyebrow')}</Typography>
                <Typography fontWeight={900}>{t('admin.common.center')}</Typography>
              </Box>
            </Stack>
          </Box>
          <Divider sx={{borderColor: 'rgba(255,255,255,.1)'}}/>
          <AdminNavigation pathname={pathname} t={t}/>
        </Paper>
        <Box sx={{minWidth: 0}}>
          <Outlet/>
        </Box>
      </Box>
    </Stack>
  );
}
