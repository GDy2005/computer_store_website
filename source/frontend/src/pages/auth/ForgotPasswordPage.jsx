import {useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import AuthCard from './AuthCard.jsx';

export default function ForgotPasswordPage() {
  const {t} = useLanguage();
  const [email,setEmail] = useState('');
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');
  const [accepted,setAccepted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await axios.post('/api/v1/auth/forgot-password', {email});
      setAccepted(true);
    } catch (requestError) {
      setError(getApiMessage(requestError, t('auth.requestError')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={t('auth.forgotTitle')} description={t('auth.forgotDescription')}>
      {accepted && <Alert severity="success">{t('auth.requestAccepted')}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {!accepted && (
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('auth.sending') : t('auth.sendReset')}
          </Button>
        </Stack>
      )}
      <Typography component={Link} to="/login" color="primary">{t('auth.backLogin')}</Typography>
    </AuthCard>
  );
}
