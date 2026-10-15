import {CircularProgress,Stack} from '@mui/material';
import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from './AuthContext.jsx';

export default function ProtectedRoute({children}) {
  const {user,loading} = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress aria-label="Đang kiểm tra phiên đăng nhập"/>
      </Stack>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{from: location.pathname}}
      />
    );
  }

  return children;
}
