import {Alert,Box,Container} from '@mui/material';
import {Route,Routes} from 'react-router-dom';
import SiteFooter from './components/SiteFooter.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import FoundationPage from './pages/FoundationPage.jsx';
import HomePage from './pages/HomePage.jsx';

export default function App() {
  return (
    <Box sx={{display:'flex',minHeight:'100vh',flexDirection:'column'}}>
      <SiteHeader/>
      <Container component="main" maxWidth="lg" sx={{flexGrow:1,py:{xs:4,md:7}}}>
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/foundation" element={<FoundationPage/>}/>
          <Route path="*" element={<Alert severity="info">Không tìm thấy trang.</Alert>}/>
        </Routes>
      </Container>
      <SiteFooter/>
    </Box>
  );
}
