import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {useTheme} from '@mui/material/styles';

import {formatProductPrice} from '../products/productFormat.js';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import {chatErrorMessage, sendChatMessage} from './chatApi.js';
import UiIcon from '../../components/UiIcon.jsx';

function createWelcome(t) {
  return {id: 'welcome', role: 'assistant', text: t('chat.welcome')};
}

function Message({message, t}) {
  const assistant = message.role === 'assistant';

  return (
    <Stack alignItems={assistant ? 'flex-start' : 'flex-end'} spacing={1}>
      <Paper
        variant={assistant ? 'outlined' : undefined}
        sx={{
          maxWidth: '88%',
          px: 1.75,
          py: 1.25,
          bgcolor: assistant ? 'background.paper' : 'primary.main',
          color: assistant ? 'text.primary' : 'primary.contrastText',
          borderRadius: assistant ? '4px 16px 16px 16px' : '16px 4px 16px 16px'
        }}
      >
        <Typography variant="body2" sx={{whiteSpace: 'pre-line'}}>
          {message.text}
        </Typography>
      </Paper>
      {message.products?.length > 0 && (
        <Stack spacing={1} sx={{width: '100%'}}>
          {message.products.map(product => (
            <Paper key={product.productId} variant="outlined" sx={{p: 1.25}}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                {product.imageUrl && (
                  <Box
                    component="img"
                    src={product.imageUrl}
                    alt=""
                    sx={{width: 54, height: 54, objectFit: 'contain', bgcolor: '#f8f8f5', borderRadius: 1}}
                  />
                )}
                <Box sx={{minWidth: 0, flexGrow: 1}}>
                  <Typography variant="body2" fontWeight={800} noWrap>
                    {product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatProductPrice(product)}
                  </Typography>
                  <Button
                    component={Link}
                    to={product.url}
                    size="small"
                    sx={{px: 0, minWidth: 0}}
                  >
                    {t('common.viewProduct')}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default function ChatWidget() {
  const theme = useTheme();
  const {locale, t} = useLanguage();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const controller = useRef(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [createWelcome(t)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const suggestions = [t('chat.suggestion1'), t('chat.suggestion2'), t('chat.suggestion3')];

  useEffect(() => {
    setMessages(current => current.length === 1 && current[0].id === 'welcome'
      ? [createWelcome(t)]
      : current);
  }, [locale, t]);

  async function submit(value) {
    const message = value.trim();
    if (!message || loading) return;

    setInput('');
    setError('');
    setMessages(current => [
      ...current,
      {id: crypto.randomUUID(), role: 'user', text: message}
    ]);
    setLoading(true);
    controller.current = new AbortController();

    try {
      const result = await sendChatMessage(message, {
        signal: controller.current.signal
      });
      setMessages(current => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: result.answer,
          products: result.products
        }
      ]);
    } catch (requestError) {
      setError(chatErrorMessage(requestError));
    } finally {
      setLoading(false);
      controller.current = null;
    }
  }

  function close() {
    controller.current?.abort();
    setOpen(false);
  }

  function clear() {
    setMessages([createWelcome(t)]);
    setError('');
  }

  return (
    <>
      <Tooltip title={t('chat.title')} placement="left">
        <Fab
          color="secondary"
          onClick={() => setOpen(true)}
          aria-label={t('chat.open')}
          sx={{
            position: 'fixed',
            right: {xs: 16, md: 28},
            bottom: {xs: 16, md: 28},
            zIndex: theme.zIndex.appBar,
            width: 62,
            height: 62,
            color: '#09251e',
            boxShadow: '0 16px 38px rgba(8,49,39,.28)',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            '&:hover': {transform: 'translateY(-4px) scale(1.03)', boxShadow: '0 20px 44px rgba(8,49,39,.34)'}
          }}
        >
          <UiIcon name="chat" sx={{fontSize: 29}}/>
        </Fab>
      </Tooltip>
      <Dialog
        open={open}
        onClose={close}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        aria-labelledby="chatbot-title"
        slotProps={{paper: {sx: {height: fullScreen ? '100%' : 'min(720px, 86vh)', overflow: 'hidden'}}}}
      >
        <DialogTitle id="chatbot-title" sx={{py: 1.75, bgcolor: '#f4f8f5'}}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.4} alignItems="center">
              <Box sx={{display:'grid',placeItems:'center',width:42,height:42,borderRadius:'14px',bgcolor:'secondary.main',color:'#09251e'}}>
                <UiIcon name="chat"/>
              </Box>
              <Box>
                <Typography component="span" variant="h6" fontWeight={900}>{t('chat.title')}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{t('chat.subtitle')}</Typography>
              </Box>
            </Stack>
            <IconButton onClick={close} aria-label={t('chat.close')}><UiIcon name="close"/></IconButton>
          </Stack>
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{display: 'flex', flexDirection: 'column', gap: 1.5, p: 2}}>
          <Stack role="log" aria-live="polite" aria-busy={loading} spacing={1.5}>
            {messages.map(message => <Message key={message.id} message={message} t={t}/>)}
          </Stack>
          {messages.length === 1 && (
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
              {suggestions.map(suggestion => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  variant="outlined"
                  onClick={() => submit(suggestion)}
                  clickable
                />
              ))}
            </Stack>
          )}
          {loading && (
            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
              <CircularProgress size={18}/>
              <Typography variant="body2">{t('chat.loading')}</Typography>
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{flexGrow: 1}}/>
          <Typography variant="caption" color="text.secondary">
            {t('chat.note')}
          </Typography>
        </DialogContent>
        <Divider/>
        <Box
          component="form"
          onSubmit={event => {
            event.preventDefault();
            submit(input);
          }}
          sx={{p: 2}}
        >
          <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} alignItems={{sm: 'flex-end'}}>
            <TextField
              value={input}
              onChange={event => setInput(event.target.value)}
              label={t('chat.input')}
              inputProps={{maxLength: 800}}
              disabled={loading}
              fullWidth
              multiline
              maxRows={3}
            />
            <Button type="submit" variant="contained" disabled={loading || input.trim().length < 2} endIcon={<UiIcon name="send"/>} sx={{width:{xs:'100%',sm:'auto'}}}>
              {t('chat.send')}
            </Button>
          </Stack>
        </Box>
        <DialogActions sx={{px: 2, py: 1, justifyContent: 'flex-start'}}>
          <Button size="small" color="inherit" onClick={clear} disabled={loading}>
            {t('chat.clear')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
