import {useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import AuthCard from './AuthCard.jsx';

export default function ForgotPasswordPage() {
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
      setError(getApiMessage(requestError, 'Không thể gửi yêu cầu.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Khôi phục mật khẩu" description="Nếu email tồn tại, hệ thống sẽ gửi một liên kết dùng một lần.">
      {accepted && <Alert severity="success">Yêu cầu đã được tiếp nhận. Hãy kiểm tra email.</Alert>}
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
            {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
          </Button>
        </Stack>
      )}
      <Typography component={Link} to="/login" color="primary">Về trang đăng nhập</Typography>
    </AuthCard>
  );
}
