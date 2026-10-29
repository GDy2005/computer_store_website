import {useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField,Typography} from '@mui/material';
import {Link,useSearchParams} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import AuthCard from './AuthCard.jsx';

export default function PasswordActionPage({activation=false}) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password,setPassword] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');
  const [changed,setChanged] = useState(false);
  const title = activation ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu';

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không khớp.');
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
      setError(getApiMessage(requestError, 'Liên kết không hợp lệ hoặc đã hết hạn.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title={title} description="Mật khẩu cần ít nhất 8 ký tự.">
      {!token && <Alert severity="error">Liên kết không có token hợp lệ.</Alert>}
      {changed && <Alert severity="success">Mật khẩu đã được lưu. Bạn có thể đăng nhập.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {!changed && token && (
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField label="Mật khẩu mới" type="password" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)}/>
          <TextField label="Nhập lại mật khẩu" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Đang lưu…' : 'Lưu mật khẩu'}
          </Button>
        </Stack>
      )}
      <Typography component={Link} to="/login" color="primary">Về trang đăng nhập</Typography>
    </AuthCard>
  );
}
