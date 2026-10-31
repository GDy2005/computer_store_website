import {useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField,Typography} from '@mui/material';
import {Link,useSearchParams} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import AuthCard from './AuthCard.jsx';

export default function PasswordActionPage({activation=false}) {
  const {t} = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password,setPassword] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');
  const [changed,setChanged] = useState(false);
  const title = activation ? t('auth.activationTitle') : t('auth.resetTitle');

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }
    if (password !== confirmation) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await axios.post(
        activation ? '/api/v1/auth/activate' : '/api/v1/auth/reset-password',
        {token,password}
      );
      setChanged(true);
    } catch (requestError) {
      setError(getApiMessage(requestError, t('auth.linkInvalid')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={title} description={t('auth.passwordHint')}>
      {!token && <Alert severity="error">{t('auth.tokenMissing')}</Alert>}
      {changed && <Alert severity="success">{t('auth.passwordSaved')}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {!changed && token && (
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField label={t('auth.newPassword')} type="password" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)}/>
          <TextField label={t('auth.confirmPassword')} type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('auth.saving') : t('auth.savePassword')}
          </Button>
        </Stack>
      )}
      <Typography component={Link} to="/login" color="primary">{t('auth.backLogin')}</Typography>
    </AuthCard>
  );
}
