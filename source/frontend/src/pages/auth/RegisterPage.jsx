import {useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import AuthCard from './AuthCard.jsx';

const initial = {
  email:'',fullName:'',label:'Nhà',recipientName:'',phone:'',
  addressLine:'',ward:'',district:'',province:''
};

export default function RegisterPage() {
  const [form,setForm] = useState(initial);
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');
  const [accepted,setAccepted] = useState(false);

  function field(name,label,options={}) {
    return (
      <TextField
        label={label}
        required={options.required !== false}
        type={options.type || 'text'}
        autoComplete={options.autoComplete}
        value={form[name]}
        onChange={event => setForm({...form,[name]:event.target.value})}
      />
    );
  }

  async function submit(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await axios.post('/api/v1/auth/register', {
        email: form.email,
        fullName: form.fullName,
        address: {
          ...(form.label.trim() ? {label: form.label} : {}),
          recipientName: form.recipientName,
          phone: form.phone,
          addressLine: form.addressLine,
          ward: form.ward,
          district: form.district,
          province: form.province
        }
      });
      setAccepted(true);
    } catch (requestError) {
      setError(getApiMessage(requestError, 'Không thể tạo tài khoản.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <AuthCard title="Kiểm tra email của bạn">
        <Alert severity="success">
          Tài khoản đã được tạo. Hãy mở liên kết kích hoạt để đặt mật khẩu.
        </Alert>
        <Button component={Link} to="/login">Về trang đăng nhập</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Tạo tài khoản" description="Nhập thông tin nhận hàng đầu tiên. Mật khẩu được đặt qua email kích hoạt.">
      {error && <Alert severity="error">{error}</Alert>}
      <Stack component="form" spacing={2} onSubmit={submit}>
        {field('email','Email',{type:'email',autoComplete:'email'})}
        {field('fullName','Họ và tên',{autoComplete:'name'})}
        <Typography variant="h6" fontWeight={700}>Địa chỉ giao hàng</Typography>
        {field('label','Nhãn địa chỉ',{required:false})}
        {field('recipientName','Tên người nhận',{autoComplete:'name'})}
        {field('phone','Số điện thoại',{autoComplete:'tel'})}
        {field('addressLine','Số nhà, tên đường',{autoComplete:'street-address'})}
        {field('ward','Phường / xã')}
        {field('district','Quận / huyện')}
        {field('province','Tỉnh / thành phố')}
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Đang tạo…' : 'Tạo tài khoản'}
        </Button>
      </Stack>
      <Typography component={Link} to="/login" color="primary">Đã có tài khoản?</Typography>
    </AuthCard>
  );
}
