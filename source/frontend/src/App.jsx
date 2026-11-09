import {useEffect} from 'react';
import {Alert,Box,Container} from '@mui/material';
import {Navigate,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import SiteFooter from './components/SiteFooter.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import PasswordActionPage from './pages/auth/PasswordActionPage.jsx';
import ProfilePage from './pages/profile/ProfilePage.jsx';
import AddressesPage from './pages/profile/AddressesPage.jsx';
import ProtectedRoute from './features/auth/ProtectedRoute.jsx';
import ProductsPage from './pages/products/ProductsPage.jsx';
import ProductDetailPage from './pages/products/ProductDetailPage.jsx';
import CheckoutPage from './pages/checkout/CheckoutPage.jsx';
import OrderProcessingPage from './pages/checkout/OrderProcessingPage.jsx';
import OrdersPage from './pages/orders/OrdersPage.jsx';
import OrderDetailPage from './pages/orders/OrderDetailPage.jsx';
import LoyaltyPage from './pages/loyalty/LoyaltyPage.jsx';
import AdminRoute from './features/admin/AdminRoute.jsx';
import AdminLayout from './features/admin/AdminLayout.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminProductsPage from './pages/admin/AdminProductsPage.jsx';
import AdminProductEditorPage from './pages/admin/AdminProductEditorPage.jsx';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminOrdersPage from './pages/admin/AdminOrdersPage.jsx';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage.jsx';
import AdminCouponsPage from './pages/admin/AdminCouponsPage.jsx';
import ChatWidget from './features/chatbot/ChatWidget.jsx';
import {useLanguage} from './features/i18n/LanguageContext.jsx';
import CartDrawer from './features/cart/CartDrawer.jsx';
import {useCart} from './features/cart/CartContext.jsx';
import {useAuth} from './features/auth/AuthContext.jsx';

function LegacyCartRoute() {
  const navigate = useNavigate();
  const {openCart} = useCart();

  useEffect(() => {
    openCart();
    navigate('/products', {replace: true});
  }, [navigate, openCart]);

  return null;
}

export default function App() {
  const {pathname} = useLocation();
  const {t} = useLanguage();
  const {user,loading:authLoading} = useAuth();
  const adminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const homePage = pathname === '/';

  if (!authLoading && user?.role === 'ADMIN' && !adminPage) {
    return <Navigate to="/admin" replace/>;
  }

  return (
    <Box sx={{display:'flex',minHeight:'100vh',flexDirection:'column'}}>
      <Box
        component="a"
        href="#main-content"
        sx={{
          position:'fixed',
          left:16,
          top:8,
          zIndex:theme => theme.zIndex.modal + 1,
          transform:'translateY(-160%)',
          bgcolor:'background.paper',
          color:'primary.main',
          px:2,
          py:1,
          borderRadius:1,
          boxShadow:3,
          fontWeight:800,
          textDecoration:'none',
          '&:focus':{transform:'translateY(0)'}
        }}
      >
        {t('a11y.skip')}
      </Box>
      {!adminPage && <SiteHeader/>}
      <Container
        id="main-content"
        tabIndex={-1}
        component="main"
        maxWidth={adminPage ? false : homePage ? 'xl' : 'lg'}
        disableGutters={adminPage}
        sx={{
          flexGrow:1,
          py:adminPage ? 0 : homePage ? {xs:2,sm:3,md:4} : {xs:3,sm:4,md:6},
          outline:'none'
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/products" element={<ProductsPage/>}/>
          <Route path="/products/:slug" element={<ProductDetailPage/>}/>
          <Route path="/cart" element={<LegacyCartRoute/>}/>
          <Route path="/checkout" element={<CheckoutPage/>}/>
          <Route path="/checkout/:orderNumber" element={<OrderProcessingPage/>}/>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="/register" element={<RegisterPage/>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/activate" element={<PasswordActionPage activation/>}/>
          <Route path="/reset-password" element={<PasswordActionPage/>}/>
          <Route path="/profile" element={<ProtectedRoute roles={['CUSTOMER']}><ProfilePage/></ProtectedRoute>}/>
          <Route path="/profile/addresses" element={<ProtectedRoute roles={['CUSTOMER']}><AddressesPage/></ProtectedRoute>}/>
          <Route path="/orders" element={<ProtectedRoute roles={['CUSTOMER']}><OrdersPage/></ProtectedRoute>}/>
          <Route path="/orders/:orderNumber" element={<ProtectedRoute roles={['CUSTOMER']}><OrderDetailPage/></ProtectedRoute>}/>
          <Route path="/loyalty" element={<ProtectedRoute roles={['CUSTOMER']}><LoyaltyPage/></ProtectedRoute>}/>
          <Route path="/admin" element={<AdminRoute><AdminLayout/></AdminRoute>}>
            <Route index element={<AdminDashboardPage/>}/>
            <Route path="products" element={<AdminProductsPage/>}/>
            <Route path="products/new" element={<AdminProductEditorPage/>}/>
            <Route path="products/:id/edit" element={<AdminProductEditorPage/>}/>
            <Route path="categories" element={<AdminCategoriesPage/>}/>
            <Route path="users" element={<AdminUsersPage/>}/>
            <Route path="orders" element={<AdminOrdersPage/>}/>
            <Route path="orders/:id" element={<AdminOrderDetailPage/>}/>
            <Route path="coupons" element={<AdminCouponsPage/>}/>
          </Route>
          <Route path="*" element={<Alert severity="info">{t('common.notFound')}</Alert>}/>
        </Routes>
      </Container>
      {!adminPage && <SiteFooter/>}
      {!adminPage && <CartDrawer/>}
      {!adminPage && <ChatWidget/>}
    </Box>
  );
}
