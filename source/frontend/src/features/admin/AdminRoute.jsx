import {Alert, Box, Button, CircularProgress, Stack} from '@mui/material';
import {Link, Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext.jsx';
import {useLanguage} from '../i18n/LanguageContext.jsx';

export default function AdminRoute({children}) {
  const {t} = useLanguage();
  const {user, loading} = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{display: 'grid', placeItems: 'center', minHeight: 320}}>
        <CircularProgress aria-label={t('admin.route.checking')}/>
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
          {t('admin.route.forbidden')}
        </Alert>
        <Button component={Link} to="/" sx={{alignSelf: 'flex-start'}}>
          {t('admin.route.home')}
        </Button>
      </Stack>
    );
  }

  return children;
}
