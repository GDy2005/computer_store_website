import {useEffect,useState} from 'react';
import axios from 'axios';
import {Alert,Button,Paper,Stack,Typography} from '@mui/material';
import {useLanguage} from '../features/i18n/LanguageContext.jsx';

export default function FoundationPage() {
  const {t} = useLanguage();
  const [data,setData] = useState(null);
  const [error,setError] = useState('');
  const [result,setResult] = useState('');

  const refresh = () => axios.get('/api/v1/foundation/status')
    .then(response => {
      setData(response.data.data);
      setError('');
    })
    .catch(() => setError(t('foundation.connectError')));

  useEffect(() => {
    refresh();
  }, []);

  async function probe() {
    try {
      const response = await axios.post('/api/v1/foundation/identity/probes', {message:'Frontend foundation check',mode:'normal'});
      setResult(t('foundation.probeSent',{id:response.data.data.probeId}));
      setTimeout(refresh, 2000);
    } catch {
      setError(t('foundation.probeError'));
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('foundation.title')}</Typography>
      <Typography>{t('foundation.description')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {result && <Alert severity="info">{result}</Alert>}
      <Stack direction={{xs:'column',sm:'row'}} spacing={2} alignItems={{sm:'flex-start'}}>
        <Button variant="contained" onClick={probe}>{t('foundation.probe')}</Button>
        <Button onClick={refresh}>{t('foundation.refresh')}</Button>
      </Stack>
      {data?.map(service => (
        <Paper key={service.service} sx={{p:2}}>
          <Typography variant="h6">{service.service}</Typography>
          <Typography color="text.secondary">
            {service.database} · Events: {service.processedEvents} · Outbox: {service.pendingOutbox} · DLQ: {service.deadLetters}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
}
