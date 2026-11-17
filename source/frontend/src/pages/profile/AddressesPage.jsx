import {useCallback,useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Box,Button,Chip,CircularProgress,Paper,Stack,Tooltip,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import {formatAddress} from '../../features/address/addressFormat.js';
import AddressFormFields from '../../features/address/AddressFormFields.jsx';
import {
  addressLabelText,
  emptyAddressForm,
  normalizeAddressForm,
  toAddressPayload
} from '../../features/address/administrativeUnits.js';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

function addressId(address) {
  return address?.id || address?._id || '';
}

export default function AddressesPage() {
  const {locale, t} = useLanguage();
  const [addresses,setAddresses] = useState([]);
  const [form,setForm] = useState(emptyAddressForm);
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
    setEditingId(addressId(address));
    setForm(normalizeAddressForm(address));
  }

  function resetForm() {
    setEditingId('');
    setForm(emptyAddressForm);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      setError('');
      const payload = toAddressPayload(form);
      if (editingId) {
        await axios.patch(`/api/v1/users/me/addresses/${encodeURIComponent(editingId)}`, payload);
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
            <Paper key={addressId(address)} variant="outlined" sx={{p:{xs:2.25,sm:3},bgcolor:'rgba(255,255,255,.88)',transition:'transform 180ms ease, box-shadow 180ms ease','&:hover':{transform:'translateY(-2px)',boxShadow:'0 14px 38px rgba(18,76,61,.09)'}}}>
              <Stack direction={{xs:'column',sm:'row'}} spacing={2.25}>
                <Box sx={{display:'grid',placeItems:'center',width:48,height:48,flex:'0 0 auto',borderRadius:'15px',bgcolor:'rgba(18,76,61,.09)',color:'primary.main'}}>
                  <UiIcon name="location"/>
                </Box>
                <Stack spacing={1.15} flexGrow={1}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography fontWeight={900}>{addressLabelText(address.label, t)}</Typography>
                    {address.isDefault && <Chip size="small" color="primary" label={t('address.default')}/>}
                  </Stack>
                  <Typography fontWeight={650}>{address.recipientName} · {address.phone}</Typography>
                  <Typography color="text.secondary" sx={{lineHeight:1.7}}>{formatAddress(address, locale)}</Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap" pt={0.5}>
                    <Button size="small" disabled={!addressId(address)} onClick={() => edit(address)}>{t('address.edit')}</Button>
                    {!address.isDefault && <Button size="small" disabled={!addressId(address)} onClick={() => run(() => axios.patch(`/api/v1/users/me/addresses/${encodeURIComponent(addressId(address))}/default`), t('address.defaultError'))}>{t('address.setDefault')}</Button>}
                    <Tooltip title={addresses.length === 1 ? t('address.lastRequired') : ''}>
                      <span>
                        <Button color="error" size="small" disabled={!addressId(address) || addresses.length === 1} onClick={() => run(() => axios.delete(`/api/v1/users/me/addresses/${encodeURIComponent(addressId(address))}`), t('address.deleteError'))}>{t('address.delete')}</Button>
                      </span>
                    </Tooltip>
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
          <AddressFormFields value={form} setValue={setForm}/>
          <Stack direction="row" gap={1}>
            <Button type="submit" variant="contained" disabled={submitting}>{submitting ? t('address.saving') : editingId ? t('address.save') : t('address.add')}</Button>
            {editingId && <Button onClick={resetForm}>{t('address.cancel')}</Button>}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
