import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Box,Button,Chip,CircularProgress,Paper,Stack,TextField,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import {formatAddress} from '../../features/address/addressFormat.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

const emptyForm = {label:'Nhà',recipientName:'',phone:'',addressLine:'',ward:'',district:'',province:''};

export default function AddressesPage() {
  const {locale, t} = useLanguage();
  const [addresses,setAddresses] = useState([]);
  const [form,setForm] = useState(emptyForm);
  const [editingId,setEditingId] = useState('');
  const [loading,setLoading] = useState(true);
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/users/me/addresses');
      setAddresses(response.data.data);
    } catch (requestError) {
      setError(getApiMessage(requestError, t('address.loadError')));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    if (submitting) return;
    try {
      setSubmitting(true);
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
      setError(getApiMessage(requestError, t('address.saveError')));
    } finally {
      setSubmitting(false);
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
    <Stack spacing={3.5} maxWidth={960} mx="auto">
      <Stack direction={{xs:'column',sm:'row'}} justifyContent="space-between" gap={1}>
        <Box>
          <Typography component="h1" variant="h3" fontWeight={950}>{t('address.title')}</Typography>
          <Typography color="text.secondary" mt={0.75}>{t('address.description')}</Typography>
        </Box>
        <Button component={Link} to="/profile" startIcon={<UiIcon name="arrowLeft"/>}>{t('address.back')}</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? <CircularProgress aria-label="Đang tải địa chỉ"/> : (
        <Stack spacing={2}>
          {addresses.length === 0 && <Alert severity="info">{t('address.empty')}</Alert>}
          {addresses.map(address => (
            <Paper key={address._id} variant="outlined" sx={{p:{xs:2.25,sm:3},bgcolor:'rgba(255,255,255,.88)',transition:'transform 180ms ease, box-shadow 180ms ease','&:hover':{transform:'translateY(-2px)',boxShadow:'0 14px 38px rgba(18,76,61,.09)'}}}>
              <Stack direction={{xs:'column',sm:'row'}} spacing={2.25}>
                <Box sx={{display:'grid',placeItems:'center',width:48,height:48,flex:'0 0 auto',borderRadius:'15px',bgcolor:'rgba(18,76,61,.09)',color:'primary.main'}}>
                  <UiIcon name="location"/>
                </Box>
                <Stack spacing={1.15} flexGrow={1}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography fontWeight={900}>{address.label || t('address.fallbackLabel')}</Typography>
                    {address.isDefault && <Chip size="small" color="primary" label={t('address.default')}/>}
                  </Stack>
                  <Typography fontWeight={650}>{address.recipientName} · {address.phone}</Typography>
                  <Typography color="text.secondary" sx={{lineHeight:1.7}}>{formatAddress(address, locale)}</Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap" pt={0.5}>
                    <Button size="small" onClick={() => edit(address)}>{t('address.edit')}</Button>
                    {!address.isDefault && <Button size="small" onClick={() => run(() => axios.patch(`/api/v1/users/me/addresses/${address._id}/default`), t('address.defaultError'))}>{t('address.setDefault')}</Button>}
                    <Button color="error" size="small" onClick={() => run(() => axios.delete(`/api/v1/users/me/addresses/${address._id}`), t('address.deleteError'))}>{t('address.delete')}</Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <Paper component="form" variant="outlined" sx={{p:{xs:3,sm:4},bgcolor:'rgba(255,255,255,.9)'}} onSubmit={submit}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={900}>{editingId ? t('address.editTitle') : t('address.addTitle')}</Typography>
          <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'repeat(2,minmax(0,1fr))'},gap:2}}>
            {Object.entries({label:t('address.label'),recipientName:t('address.recipient'),phone:t('address.phone'),addressLine:t('address.street'),ward:t('address.ward'),district:t('address.district'),province:t('address.province')}).map(([name,label]) => (
              <TextField key={name} label={label} required={name !== 'label'} value={form[name]} onChange={event => setForm({...form,[name]:event.target.value})} sx={name === 'addressLine' || name === 'province' ? {gridColumn:{sm:'1 / -1'}} : undefined}/>
            ))}
          </Box>
          <Stack direction="row" gap={1}>
            <Button type="submit" variant="contained" disabled={submitting}>{submitting ? t('address.saving') : editingId ? t('address.save') : t('address.add')}</Button>
            {editingId && <Button onClick={resetForm}>{t('address.cancel')}</Button>}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
