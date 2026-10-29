import {useState} from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../features/auth/AuthContext.jsx';
import {useCart} from '../features/cart/CartContext.jsx';

const navigation = [
  {label:'Trang chủ',to:'/'},
  {label:'Sản phẩm',to:'/products'},
  {label:'Hệ thống',to:'/foundation'}
];

export default function SiteHeader() {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const {user,loading,logout} = useAuth();
  const {cart} = useCart();
  const [mobileOpen,setMobileOpen] = useState(false);

  const active = to => (
    to === '/'
      ? pathname === '/'
      : pathname === to || pathname.startsWith(`${to}/`)
  );

  const userNavigation = user
    ? [
        ...(user.role === 'ADMIN' ? [{label:'Quản trị',to:'/admin'}] : []),
        {label:'Đơn hàng',to:'/orders'},
        {label:'Hồ sơ',to:'/profile'}
      ]
    : [{label:'Đăng nhập',to:'/login'}];

  const allNavigation = [
    ...navigation,
    {label:`Giỏ hàng (${cart.totalItems})`,to:'/cart'},
    ...userNavigation
  ];

  async function signOut() {
    try {
      await logout();
      setMobileOpen(false);
      navigate('/');
    } catch {
      navigate('/login');
    }
  }

  return (
    <AppBar position="sticky" elevation={0} sx={{borderBottom:'1px solid',borderColor:'rgba(255,255,255,0.14)'}}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{minHeight:{xs:64,md:72}}}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{flexGrow:1,color:'inherit',fontWeight:800,letterSpacing:{xs:0.4,sm:1},textDecoration:'none'}}
          >
            COMPUTER STORE
          </Typography>
          <Stack component="nav" direction="row" spacing={1} aria-label="Điều hướng chính" sx={{display:{xs:'none',md:'flex'}}}>
            {navigation.map(item => (
              <Button
                key={item.to}
                color="inherit"
                component={Link}
                to={item.to}
                aria-current={active(item.to) ? 'page' : undefined}
                sx={{fontWeight:active(item.to) ? 700 : 500,minWidth:64,px:1.5}}
              >
                {item.label}
              </Button>
            ))}
            <Button
              color="inherit"
              component={Link}
              to="/cart"
              aria-current={pathname.startsWith('/cart') || pathname.startsWith('/checkout') ? 'page' : undefined}
              sx={{fontWeight:pathname.startsWith('/cart') || pathname.startsWith('/checkout') ? 700 : 500,minWidth:64,px:1.5}}
            >
              <Badge badgeContent={cart.totalItems} color="secondary" max={99}>
                Giỏ hàng
              </Badge>
            </Button>
            {loading && <CircularProgress size={22} color="inherit" sx={{m:1}}/>}
            {!loading && !user && (
              <Button color="inherit" component={Link} to="/login">Đăng nhập</Button>
            )}
            {!loading && user && (
              <>
                {user.role === 'ADMIN' && <Button color="inherit" component={Link} to="/admin" sx={{fontWeight:pathname.startsWith('/admin') ? 800 : 500}}>Quản trị</Button>}
                <Button color="inherit" component={Link} to="/orders">Đơn hàng</Button>
                <Button color="inherit" component={Link} to="/profile">Hồ sơ</Button>
                <Button color="inherit" onClick={signOut}>Đăng xuất</Button>
              </>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} sx={{display:{xs:'flex',md:'none'}}}>
            {loading && <CircularProgress size={22} color="inherit"/>}
            <Button color="inherit" onClick={() => setMobileOpen(true)} aria-label="Mở menu điều hướng">
              <Badge badgeContent={cart.totalItems} color="secondary" max={99}>Menu</Badge>
            </Button>
          </Stack>
        </Toolbar>
      </Container>
      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{width:280,p:2}}>
          <Typography variant="h6" fontWeight={850}>COMPUTER STORE</Typography>
          <Typography variant="body2" color="text.secondary">
            {user ? user.fullName : 'Khách truy cập'}
          </Typography>
        </Box>
        <Divider/>
        <List component="nav" aria-label="Điều hướng di động" sx={{p:1}}>
          {allNavigation.map(item => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={active(item.to) || (item.to === '/cart' && pathname.startsWith('/checkout'))}
              onClick={() => setMobileOpen(false)}
              sx={{borderRadius:1.5,mb:0.5}}
            >
              <ListItemText primary={item.label} primaryTypographyProps={{fontWeight:active(item.to) ? 800 : 600}}/>
            </ListItemButton>
          ))}
          {user && (
            <ListItemButton onClick={signOut} sx={{borderRadius:1.5,color:'error.main'}}>
              <ListItemText primary="Đăng xuất" primaryTypographyProps={{fontWeight:700}}/>
            </ListItemButton>
          )}
        </List>
      </Drawer>
    </AppBar>
  );
}
