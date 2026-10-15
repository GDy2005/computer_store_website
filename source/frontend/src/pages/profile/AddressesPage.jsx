import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Button,Chip,CircularProgress,Paper,Stack,TextField,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';

const emptyForm = {label:'Nhà',recipientName:'',phone:'',addressLine:'',ward:'',district:'',province:''};

export default function AddressesPage() {
  const [addresses,setAddresses] = useState([]);
  const [form,setForm] = useState(emptyForm);
  const [editingId,setEditingId] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/users/me/addresses');
      setAddresses(response.data.data);
    } catch (requestError) {
      setError(getApiMessage(requestError, 'Không thể tải địa chỉ.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function edit(address) {
    setEditingId(address._id);
    setForm(Object.fromEntries(Object.keys(emptyForm).map(key => [key,address[key] || ''])));
  }

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function submit(event) {
    event.preventDefault();
    try {
      setError('');
      const payload = {
        ...form,
        ...(form.label.trim() ? {} : {label: undefined})
      };
      if (editingId) {
        await axios.patch(`/api/v1/users/me/addresses/${editingId}`, payload);
      } else {
        await axios.post('/api/v1/users/me/addresses', payload);
      }
      resetForm();
      await load();
    } catch (requestError) {
      setError(getApiMessage(requestError, 'Không thể lưu địa chỉ.'));
    }
  }

  async function run(action, fallback) {
    try {
      setError('');
      await action();
      await load();
    } catch (requestError) {
      setError(getApiMessage(requestError, fallback));
    }
  }

  return (
    <Stack spacing={3} maxWidth={900} mx="auto">
      <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}>
        <Typography component="h1" variant="h4" fontWeight={800}>Địa chỉ giao hàng</Typography>
        <Button component={Link} to="/profile">Về hồ sơ</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <CircularProgress aria-label="Đang tải địa chỉ"/> : (
        <Stack spacing={2}>
          {addresses.length === 0 && <Alert severity="info">Bạn chưa có địa chỉ.</Alert>}
          {addresses.map(address => (
            <Paper key={address._id} variant="outlined" sx={{p:2.5}}>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography fontWeight={800}>{address.label || 'Địa chỉ'}</Typography>
                  {address.isDefault && <Chip size="small" color="primary" label="Mặc định"/>}
                </Stack>
                <Typography>{address.recipientName} · {address.phone}</Typography>
                <Typography color="text.secondary">{address.addressLine}, {address.ward}, {address.district}, {address.province}</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button size="small" onClick={() => edit(address)}>Sửa</Button>
                  {!address.isDefault && <Button size="small" onClick={() => run(() => axios.patch(`/api/v1/users/me/addresses/${address._id}/default`), 'Không thể đặt địa chỉ mặc định.')}>Đặt mặc định</Button>}
                  <Button color="error" size="small" onClick={() => run(() => axios.delete(`/api/v1/users/me/addresses/${address._id}`), 'Không thể xóa địa chỉ.')}>Xóa</Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Paper component="form" variant="outlined" sx={{p:{xs:3,sm:4}}} onSubmit={submit}>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>{editingId ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</Typography>
          {Object.entries({label:'Nhãn địa chỉ',recipientName:'Tên người nhận',phone:'Số điện thoại',addressLine:'Số nhà, tên đường',ward:'Phường / xã',district:'Quận / huyện',province:'Tỉnh / thành phố'}).map(([name,label]) => (
            <TextField key={name} label={label} required={name !== 'label'} value={form[name]} onChange={event => setForm({...form,[name]:event.target.value})}/>
          ))}
          <Stack direction="row" gap={1}>
            <Button type="submit" variant="contained">{editingId ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}</Button>
            {editingId && <Button onClick={resetForm}>Hủy</Button>}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
