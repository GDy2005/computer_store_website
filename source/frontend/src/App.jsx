import {Alert,Box,Container} from '@mui/material';
import {Route,Routes} from 'react-router-dom';
import SiteFooter from './components/SiteFooter.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import FoundationPage from './pages/FoundationPage.jsx';
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

export default function App() {
  return (
    <Box sx={{display:'flex',minHeight:'100vh',flexDirection:'column'}}>
      <SiteHeader/>
      <Container component="main" maxWidth="lg" sx={{flexGrow:1,py:{xs:4,md:7}}}>
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/products" element={<ProductsPage/>}/>
          <Route path="/products/:slug" element={<ProductDetailPage/>}/>
          <Route path="/foundation" element={<FoundationPage/>}/>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="/register" element={<RegisterPage/>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/activate" element={<PasswordActionPage activation/>}/>
          <Route path="/reset-password" element={<PasswordActionPage/>}/>
          <Route path="/profile" element={<ProtectedRoute><ProfilePage/></ProtectedRoute>}/>
          <Route path="/profile/addresses" element={<ProtectedRoute><AddressesPage/></ProtectedRoute>}/>
          <Route path="*" element={<Alert severity="info">Không tìm thấy trang.</Alert>}/>
        </Routes>
      </Container>
      <SiteFooter/>
    </Box>
  );
}
