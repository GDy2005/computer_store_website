import {useState} from 'react';
import {Alert,Button,Divider,Stack,TextField,Typography} from '@mui/material';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {getApiMessage,useAuth} from '../../features/auth/AuthContext.jsx';
import AuthCard from './AuthCard.jsx';

export default function LoginPage() {
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
      setError(getApiMessage(requestError, 'Không thể đăng nhập.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Đăng nhập" description="Phiên đăng nhập được bảo vệ trên máy chủ.">
      {searchParams.get('oauth') === 'failed' && (
        <Alert severity="error">Google không thể xác nhận tài khoản. Vui lòng thử lại.</Alert>
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
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={event => setForm({...form,password:event.target.value})}
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </Stack>
      <Button component="a" href="/api/v1/auth/google" variant="outlined" size="large">
        Tiếp tục với Google
      </Button>
      <Divider/>
      <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}>
        <Typography component={Link} to="/register" color="primary">Tạo tài khoản</Typography>
        <Typography component={Link} to="/forgot-password" color="primary">Quên mật khẩu?</Typography>
      </Stack>
    </AuthCard>
  );
}
