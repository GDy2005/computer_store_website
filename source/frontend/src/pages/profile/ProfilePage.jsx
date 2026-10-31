import {useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Button,Paper,Stack,TextField,Typography} from '@mui/material';
import {Link,useSearchParams} from 'react-router-dom';
import {getApiMessage,useAuth} from '../../features/auth/AuthContext.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';

export default function ProfilePage() {
  const {t} = useLanguage();
  const {user,refresh} = useAuth();
  const [searchParams] = useSearchParams();
  const [profile,setProfile] = useState({fullName:'',phone:''});
  const [passwords,setPasswords] = useState({currentPassword:'',newPassword:''});
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  useEffect(() => {
    setProfile({fullName:user.fullName || '',phone:user.phone || ''});
  }, [user]);

  async function updateProfile(event) {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      await axios.patch('/api/v1/users/me', {
        fullName: profile.fullName,
        phone: profile.phone || null
      });
      await refresh();
      setMessage(t('profile.updated'));
    } catch (requestError) {
      setError(getApiMessage(requestError, t('profile.updateError')));
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      await axios.patch('/api/v1/users/me/password', passwords);
      setPasswords({currentPassword:'',newPassword:''});
      setMessage(t('profile.passwordChanged'));
    } catch (requestError) {
      setError(getApiMessage(requestError, t('profile.passwordError')));
    }
  }

  return (
    <Stack spacing={3} maxWidth={760} mx="auto">
      <Stack spacing={0.5}>
        <Typography component="h1" variant="h4" fontWeight={800}>{t('profile.title')}</Typography>
        <Typography color="text.secondary">{user.email}</Typography>
      </Stack>
      {searchParams.get('oauth') === 'success' && <Alert severity="success">{t('profile.googleSuccess')}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper component="form" variant="outlined" sx={{p:{xs:3,sm:4}}} onSubmit={updateProfile}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>{t('profile.personal')}</Typography>
          <TextField label={t('auth.fullName')} required value={profile.fullName} onChange={event => setProfile({...profile,fullName:event.target.value})}/>
          <TextField label={t('address.phone')} value={profile.phone} onChange={event => setProfile({...profile,phone:event.target.value})}/>
          <Button type="submit" variant="contained" sx={{alignSelf:'flex-start'}}>{t('profile.save')}</Button>
        </Stack>
      </Paper>
      <Paper component="form" variant="outlined" sx={{p:{xs:3,sm:4}}} onSubmit={changePassword}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>{t('profile.changePassword')}</Typography>
          <TextField label={t('profile.currentPassword')} type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event => setPasswords({...passwords,currentPassword:event.target.value})}/>
          <TextField label={t('auth.newPassword')} type="password" autoComplete="new-password" required value={passwords.newPassword} onChange={event => setPasswords({...passwords,newPassword:event.target.value})}/>
          <Button type="submit" variant="outlined" sx={{alignSelf:'flex-start'}}>{t('profile.changePassword')}</Button>
        </Stack>
      </Paper>
      <Button component={Link} to="/profile/addresses" variant="outlined">{t('profile.addresses')}</Button>
      <Button component={Link} to="/orders" variant="outlined">{t('profile.orders')}</Button>
      <Button component={Link} to="/loyalty" variant="outlined">{t('profile.loyalty')}</Button>
    </Stack>
  );
}
