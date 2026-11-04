import {useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Avatar,Box,Button,Paper,Stack,TextField,Typography} from '@mui/material';
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
  const avatarText = (user.fullName || user.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

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
    <Stack spacing={3} maxWidth={980} mx="auto">
      <Paper sx={{overflow:'hidden',borderRadius:2,background:'linear-gradient(120deg,#111 0%,#292929 100%)',color:'common.white'}}>
        <Stack direction={{xs:'column',sm:'row'}} spacing={2.25} alignItems={{sm:'center'}} sx={{p:{xs:2.5,sm:3.5}}}>
          <Avatar
            src={user.avatarUrl || user.picture || undefined}
            alt={user.fullName || user.email}
            sx={{width:76,height:76,bgcolor:'secondary.main',color:'#151515',fontSize:25,fontWeight:900,border:'3px solid rgba(255,255,255,.16)'}}
          >
            {avatarText}
          </Avatar>
          <Box sx={{minWidth:0}}>
            <Typography component="h1" variant="h4" fontWeight={850}>{t('profile.title')}</Typography>
            <Typography fontWeight={750} mt={0.35}>{user.fullName}</Typography>
            <Typography sx={{color:'rgba(255,255,255,.62)'}}>{user.email}</Typography>
          </Box>
        </Stack>
        <Box sx={{height:4,bgcolor:'secondary.main'}}/>
      </Paper>
      {searchParams.get('oauth') === 'success' && <Alert severity="success">{t('profile.googleSuccess')}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'repeat(2,minmax(0,1fr))'},gap:2.5,alignItems:'start'}}>
        <Paper component="form" variant="outlined" sx={{p:{xs:2.5,sm:3},boxShadow:'0 10px 28px rgba(0,0,0,.05)'}} onSubmit={updateProfile}>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>{t('profile.personal')}</Typography>
            <TextField label={t('auth.fullName')} required value={profile.fullName} onChange={event => setProfile({...profile,fullName:event.target.value})}/>
            <TextField label={t('address.phone')} value={profile.phone} onChange={event => setProfile({...profile,phone:event.target.value})}/>
            <Button type="submit" variant="contained" sx={{alignSelf:'flex-start'}}>{t('profile.save')}</Button>
          </Stack>
        </Paper>
        <Paper component="form" variant="outlined" sx={{p:{xs:2.5,sm:3},boxShadow:'0 10px 28px rgba(0,0,0,.05)'}} onSubmit={changePassword}>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={800}>{t('profile.changePassword')}</Typography>
            <TextField label={t('profile.currentPassword')} type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event => setPasswords({...passwords,currentPassword:event.target.value})}/>
            <TextField label={t('auth.newPassword')} type="password" autoComplete="new-password" required value={passwords.newPassword} onChange={event => setPasswords({...passwords,newPassword:event.target.value})}/>
            <Button type="submit" variant="outlined" sx={{alignSelf:'flex-start'}}>{t('profile.changePassword')}</Button>
          </Stack>
        </Paper>
      </Box>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(3,minmax(0,1fr))'},gap:1.5}}>
        <Button component={Link} to="/profile/addresses" variant="outlined">{t('profile.addresses')}</Button>
        <Button component={Link} to="/orders" variant="outlined">{t('profile.orders')}</Button>
        <Button component={Link} to="/loyalty" variant="outlined">{t('profile.loyalty')}</Button>
      </Box>
    </Stack>
  );
}
