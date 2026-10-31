import {useState} from 'react';
import axios from 'axios';
import {Alert,Button,Stack,TextField,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import {getApiMessage} from '../../features/auth/AuthContext.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import AuthCard from './AuthCard.jsx';

const initial = {
  email:'',fullName:'',label:'Nhà',recipientName:'',phone:'',
  addressLine:'',ward:'',district:'',province:''
};

export default function RegisterPage() {
  const {t} = useLanguage();
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
      setError(getApiMessage(requestError, t('auth.registerError')));
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <AuthCard title={t('auth.checkEmail')}>
        <Alert severity="success">
          {t('auth.accountCreated')}
        </Alert>
        <Button component={Link} to="/login">{t('auth.backLogin')}</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.createAccount')} description={t('auth.registerDescription')}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack component="form" spacing={2} onSubmit={submit}>
        {field('email','Email',{type:'email',autoComplete:'email'})}
        {field('fullName',t('auth.fullName'),{autoComplete:'name'})}
        <Typography variant="h6" fontWeight={700}>{t('address.title')}</Typography>
        {field('label',t('address.label'),{required:false})}
        {field('recipientName',t('address.recipient'),{autoComplete:'name'})}
        {field('phone',t('address.phone'),{autoComplete:'tel'})}
        {field('addressLine',t('address.street'),{autoComplete:'street-address'})}
        {field('ward',t('address.ward'))}
        {field('district',t('address.district'))}
        {field('province',t('address.province'))}
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? t('auth.creating') : t('auth.createAccount')}
        </Button>
      </Stack>
      <Typography component={Link} to="/login" color="primary">{t('auth.haveAccount')}</Typography>
    </AuthCard>
  );
}
