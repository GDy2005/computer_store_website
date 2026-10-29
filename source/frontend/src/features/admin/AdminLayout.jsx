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

const adminNavigation = [
  {label: 'Dashboard', to: '/admin'},
  {label: 'Sản phẩm & tồn kho', to: '/admin/products'},
  {label: 'Danh mục', to: '/admin/categories'},
  {label: 'Người dùng', to: '/admin/users'},
  {label: 'Đơn hàng', to: '/admin/orders'},
  {label: 'Mã giảm giá', to: '/admin/coupons'}
];

function isSelected(pathname, to) {
  return to === '/admin'
    ? pathname === '/admin'
    : pathname.startsWith(to);
}

function AdminNavigation({pathname, onNavigate}) {
  return (
    <List component="nav" aria-label="Điều hướng quản trị" sx={{p: 1}}>
      {adminNavigation.map(item => (
        <ListItemButton
          key={item.to}
          component={Link}
          to={item.to}
          selected={isSelected(pathname, item.to)}
          onClick={onNavigate}
          sx={{borderRadius: 1.5, mb: 0.5}}
        >
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Stack spacing={2.5}>
      <Paper
        variant="outlined"
        sx={{display: {xs: 'flex', md: 'none'}, p: 1.5, alignItems: 'center', justifyContent: 'space-between'}}
      >
        <Box>
          <Typography variant="overline" color="secondary.main" fontWeight={800}>Admin</Typography>
          <Typography fontWeight={850}>Trung tâm quản trị</Typography>
        </Box>
        <Button variant="outlined" onClick={() => setMobileOpen(true)}>Mở menu</Button>
      </Paper>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{keepMounted: true}}
      >
        <Box sx={{width: 280, p: 2}} role="presentation">
          <Typography variant="h6" fontWeight={850}>COMPUTER STORE</Typography>
          <Typography color="text.secondary" variant="body2">Khu vực quản trị</Typography>
        </Box>
        <Divider/>
        <AdminNavigation pathname={pathname} onNavigate={() => setMobileOpen(false)}/>
      </Drawer>

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: 'minmax(0, 1fr)', md: '240px minmax(0, 1fr)'}, gap: 3, alignItems: 'start'}}>
        <Paper
          variant="outlined"
          sx={{display: {xs: 'none', md: 'block'}, position: 'sticky', top: 96, overflow: 'hidden'}}
        >
          <Box sx={{p: 2.5}}>
            <Typography variant="overline" color="secondary.main" fontWeight={850}>Admin</Typography>
            <Typography variant="h6" fontWeight={850}>Trung tâm quản trị</Typography>
          </Box>
          <Divider/>
          <AdminNavigation pathname={pathname}/>
        </Paper>
        <Box sx={{minWidth: 0}}>
          <Outlet/>
        </Box>
      </Box>
    </Stack>
  );
}
