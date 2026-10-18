import {AppBar,Badge,Button,CircularProgress,Container,Stack,Toolbar,Typography} from '@mui/material';
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

  async function signOut() {
    try {
      await logout();
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
          <Stack component="nav" direction="row" spacing={{xs:0,sm:1}} aria-label="Điều hướng chính">
            {navigation.map(item => (
              <Button
                key={item.to}
                color="inherit"
                component={Link}
                to={item.to}
                aria-current={(item.to === '/products' ? pathname.startsWith('/products') : pathname === item.to) ? 'page' : undefined}
                sx={{fontWeight:(item.to === '/products' ? pathname.startsWith('/products') : pathname === item.to) ? 700 : 500,minWidth:{xs:'auto',sm:64},px:{xs:0.75,sm:2}}}
              >
                {item.label}
              </Button>
            ))}
            <Button
              color="inherit"
              component={Link}
              to="/cart"
              aria-current={pathname.startsWith('/cart') || pathname.startsWith('/checkout') ? 'page' : undefined}
              sx={{fontWeight:pathname.startsWith('/cart') || pathname.startsWith('/checkout') ? 700 : 500,minWidth:{xs:'auto',sm:64},px:{xs:0.75,sm:2}}}
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
                <Button color="inherit" component={Link} to="/orders">Đơn hàng</Button>
                <Button color="inherit" component={Link} to="/profile">Hồ sơ</Button>
                <Button color="inherit" onClick={signOut}>Đăng xuất</Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
