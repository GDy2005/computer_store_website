import {useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Button,Paper,Stack,TextField,Typography} from '@mui/material';
import {Link,useSearchParams} from 'react-router-dom';
import {getApiMessage,useAuth} from '../../features/auth/AuthContext.jsx';

export default function ProfilePage() {
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
      setMessage('Đã cập nhật hồ sơ.');
    } catch (requestError) {
      setError(getApiMessage(requestError, 'Không thể cập nhật hồ sơ.'));
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    try {
      setError('');
      setMessage('');
      await axios.patch('/api/v1/users/me/password', passwords);
      setPasswords({currentPassword:'',newPassword:''});
      setMessage('Đã đổi mật khẩu.');
    } catch (requestError) {
      setError(getApiMessage(requestError, 'Không thể đổi mật khẩu.'));
    }
  }

  return (
    <Stack spacing={3} maxWidth={760} mx="auto">
      <Stack spacing={0.5}>
        <Typography component="h1" variant="h4" fontWeight={800}>Hồ sơ của tôi</Typography>
        <Typography color="text.secondary">{user.email}</Typography>
      </Stack>
      {searchParams.get('oauth') === 'success' && <Alert severity="success">Đăng nhập Google thành công.</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Paper component="form" variant="outlined" sx={{p:{xs:3,sm:4}}} onSubmit={updateProfile}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>Thông tin cá nhân</Typography>
          <TextField label="Họ và tên" required value={profile.fullName} onChange={event => setProfile({...profile,fullName:event.target.value})}/>
          <TextField label="Số điện thoại" value={profile.phone} onChange={event => setProfile({...profile,phone:event.target.value})}/>
          <Button type="submit" variant="contained" sx={{alignSelf:'flex-start'}}>Lưu thay đổi</Button>
        </Stack>
      </Paper>
      <Paper component="form" variant="outlined" sx={{p:{xs:3,sm:4}}} onSubmit={changePassword}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>Đổi mật khẩu</Typography>
          <TextField label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event => setPasswords({...passwords,currentPassword:event.target.value})}/>
          <TextField label="Mật khẩu mới" type="password" autoComplete="new-password" required value={passwords.newPassword} onChange={event => setPasswords({...passwords,newPassword:event.target.value})}/>
          <Button type="submit" variant="outlined" sx={{alignSelf:'flex-start'}}>Đổi mật khẩu</Button>
        </Stack>
      </Paper>
      <Button component={Link} to="/profile/addresses" variant="outlined">Quản lý địa chỉ giao hàng</Button>
      <Button component={Link} to="/orders" variant="outlined">Xem lịch sử đơn hàng</Button>
    </Stack>
  );
}
