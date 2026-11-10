import {useState} from 'react';
import {Alert,Button,Divider,Stack,SvgIcon,TextField,Typography} from '@mui/material';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {getApiMessage,useAuth} from '../../features/auth/AuthContext.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import AuthCard from './AuthCard.jsx';

function GoogleIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.3A12 12 0 1 1 31.1 14.8l5.66-5.66A20 20 0 1 0 44 24c0-1.34-.14-2.65-.39-3.92Z"/>
      <path fill="#FF3D00" d="m6.31 14.69 6.57 4.82A12 12 0 0 1 31.1 14.8l5.66-5.66A20 20 0 0 0 6.31 14.69Z"/>
      <path fill="#4CAF50" d="M24 44c5.1 0 9.74-1.95 13.24-5.13l-6.15-5.2A12 12 0 0 1 12.9 28.5l-6.52 5.02A20 20 0 0 0 24 44Z"/>
      <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.21 5.67l.01-.01 6.15 5.2C36.81 39.27 44 34 44 24c0-1.34-.14-2.65-.39-3.92Z"/>
    </SvgIcon>
  );
}

export default function LoginPage() {
  const {t} = useLanguage();
  const {login} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [form,setForm] = useState({email:'',password:''});
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const authenticatedUser = await login(form);
      const requestedPath = location.state?.from;
      const destination = authenticatedUser?.role === 'ADMIN'
        ? '/admin'
        : requestedPath?.startsWith('/admin')
          ? '/profile'
          : requestedPath || '/profile';
      navigate(destination, {replace:true});
    } catch (requestError) {
      setError(getApiMessage(requestError, t('auth.loginError')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
      {searchParams.get('oauth') === 'failed' && (
        <Alert severity="error">{t('auth.googleFailed')}</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack component="form" spacing={2} onSubmit={submit}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={event => setForm({...form,email:event.target.value})}
        />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={event => setForm({...form,password:event.target.value})}
        />
        <Button
          type="submit"
          variant="contained"
          color="secondary"
          size="large"
          disabled={submitting}
          sx={{color: 'secondary.contrastText', fontWeight: 900}}
        >
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </Stack>
      <Button
        component="a"
        href="/api/v1/auth/google"
        variant="outlined"
        size="large"
        startIcon={<GoogleIcon sx={{fontSize: 22}}/>}
        sx={{borderColor: 'divider', color: 'text.primary', fontWeight: 850, '&:hover': {borderColor: 'secondary.main', bgcolor: 'secondary.light'}}}
      >
        {t('auth.google')}
      </Button>
      <Divider/>
      <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}>
        <Typography component={Link} to="/register" color="primary">{t('auth.createAccount')}</Typography>
        <Typography component={Link} to="/forgot-password" color="primary">{t('auth.forgot')}</Typography>
      </Stack>
    </AuthCard>
  );
}
