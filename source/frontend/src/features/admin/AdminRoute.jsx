import {Alert, Box, Button, CircularProgress, Stack} from '@mui/material';
import {Link, Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext.jsx';

export default function AdminRoute({children}) {
  const {user, loading} = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{display: 'grid', placeItems: 'center', minHeight: 320}}>
        <CircularProgress aria-label="Đang kiểm tra quyền quản trị"/>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{from: location.pathname}}/>;
  }

  if (user.role !== 'ADMIN') {
    return (
      <Stack spacing={2} maxWidth={680} mx="auto">
        <Alert severity="error">
          Bạn không có quyền truy cập khu vực quản trị.
        </Alert>
        <Button component={Link} to="/" sx={{alignSelf: 'flex-start'}}>
          Về trang chủ
        </Button>
      </Stack>
    );
  }

  return children;
}
