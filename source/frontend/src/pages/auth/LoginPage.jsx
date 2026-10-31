import {useState} from 'react';
import {Alert,Button,Divider,Stack,TextField,Typography} from '@mui/material';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {getApiMessage,useAuth} from '../../features/auth/AuthContext.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import AuthCard from './AuthCard.jsx';

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
      await login(form);
      navigate(location.state?.from || '/profile', {replace:true});
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
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </Stack>
      <Button component="a" href="/api/v1/auth/google" variant="outlined" size="large">
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
