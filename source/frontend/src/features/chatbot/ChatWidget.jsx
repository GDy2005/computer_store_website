import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Fade,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {useTheme} from '@mui/material/styles';

import {formatProductPrice} from '../products/productFormat.js';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import {chatErrorMessage, sendChatMessage} from './chatApi.js';
import UiIcon from '../../components/UiIcon.jsx';
import {useCart} from '../cart/CartContext.jsx';

function createWelcome(t) {
  return {id: 'welcome', role: 'assistant', text: t('chat.welcome')};
}

function Message({message, t}) {
  const assistant = message.role === 'assistant';

  return (
    <Stack
      direction={assistant ? 'row' : 'row-reverse'}
      alignItems="flex-end"
      spacing={0.8}
      sx={{
        animation: 'chat-message-in 320ms cubic-bezier(.2,.8,.2,1) both',
        '@keyframes chat-message-in': {
          from: {opacity: 0, transform: assistant ? 'translateX(-12px)' : 'translateX(12px)'},
          to: {opacity: 1, transform: 'translateX(0)'}
        }
      }}
    >
      {assistant && (
        <Box
          aria-hidden="true"
          sx={{
            display:'grid',placeItems:'center',flex:'0 0 auto',width:27,height:27,
            borderRadius:'50%',bgcolor:'secondary.main',color:'#151515',
            boxShadow:'0 6px 14px rgba(0,0,0,.14)'
          }}
        >
          <UiIcon name="chat" sx={{fontSize:15}}/>
        </Box>
      )}
      <Stack
        alignItems={assistant ? 'flex-start' : 'flex-end'}
        spacing={0.8}
        sx={{minWidth:0,maxWidth:assistant ? 'calc(100% - 35px)' : '86%'}}
      >
        <Paper
          variant={assistant ? 'outlined' : undefined}
          sx={{
            maxWidth:'100%',px:1.4,py:1.05,
            bgcolor:assistant ? 'background.paper' : 'primary.main',
            color:assistant ? 'text.primary' : 'primary.contrastText',
            borderColor:assistant ? 'rgba(0,0,0,.12)' : 'transparent',
            borderRadius:assistant ? '4px 15px 15px 15px' : '15px 4px 15px 15px',
            boxShadow:assistant ? '0 7px 18px rgba(0,0,0,.05)' : '0 9px 20px rgba(0,0,0,.15)'
          }}
        >
          <Typography variant="body2" sx={{whiteSpace:'pre-line',lineHeight:1.55,fontSize:13.5}}>
            {message.text}
          </Typography>
        </Paper>
        {message.products?.length > 0 && (
          <Stack spacing={0.8} sx={{width:'100%'}}>
            {message.products.map(product => (
              <Paper
                key={product.productId}
                variant="outlined"
                sx={{
                  p:1,transition:'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                  '&:hover':{transform:'translateY(-2px)',borderColor:'secondary.main',boxShadow:'0 10px 24px rgba(0,0,0,.08)'}
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  {product.imageUrl && (
                    <Box
                      component="img"
                      src={product.imageUrl}
                      alt=""
                      sx={{width:48,height:48,objectFit:'contain',bgcolor:'#f8f8f5',borderRadius:1.5}}
                    />
                  )}
                  <Box sx={{minWidth:0,flexGrow:1}}>
                    <Typography variant="body2" fontWeight={800} noWrap>{product.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{formatProductPrice(product)}</Typography>
                    <Button component={Link} to={product.url} size="small" sx={{px:0,minWidth:0,fontSize:11.5}}>
                      {t('common.viewProduct')}
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function TypingIndicator({label}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" aria-label={label} color="text.secondary">
      <Paper variant="outlined" sx={{display: 'flex', gap: 0.55, px: 1.5, py: 1.25, borderRadius: '4px 16px 16px 16px'}}>
        {[0, 1, 2].map(index => (
          <Box
            key={index}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'secondary.main',
              animation: 'typing-dot 1s ease-in-out infinite',
              animationDelay: `${index * 150}ms`,
              '@keyframes typing-dot': {
                '0%, 60%, 100%': {opacity: 0.35, transform: 'translateY(0)'},
                '30%': {opacity: 1, transform: 'translateY(-4px)'}
              }
            }}
          />
        ))}
      </Paper>
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}

export default function ChatWidget() {
  const theme = useTheme();
  const {drawerOpen} = useCart();
  const {locale, t} = useLanguage();
  const controller = useRef(null);
  const messagesEndRef = useRef(null);
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

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, loading, error, open]);

  async function submit(value) {
    const message = value.trim();
    if (!message || loading) return;

    setInput('');
    setError('');
    setMessages(current => [...current, {id: crypto.randomUUID(), role: 'user', text: message}]);
    setLoading(true);
    controller.current = new AbortController();

    try {
      const result = await sendChatMessage(message, {signal: controller.current.signal});
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
    <Box
      sx={{
        position: 'fixed',
        right: drawerOpen
          ? {xs: 12, sm: 20, md: 530}
          : {xs: 12, sm: 20, md: 28},
        bottom: {xs: 12, sm: 20, md: 28},
        zIndex: {xs: theme.zIndex.modal - 1, md: theme.zIndex.modal + 1},
        pointerEvents: 'none',
        transition: 'right 280ms cubic-bezier(.2,.8,.2,1)',
        '@media (prefers-reduced-motion: reduce)': {transition: 'none'}
      }}
    >
      <Fade in={!open} timeout={{enter: 180, exit: 120}} mountOnEnter unmountOnExit>
        <Box sx={{pointerEvents: 'auto'}}>
          <IconButton
            onClick={() => setOpen(true)}
            aria-label={t('chat.open')}
            title={t('chat.title')}
            sx={{
              width: 62,
              height: 62,
              color: '#151515',
              bgcolor: 'secondary.main',
              border: '1px solid rgba(255,255,255,.8)',
              boxShadow: '0 18px 42px rgba(0,0,0,.28)',
              animation: 'chat-fab-breathe 2.8s ease-in-out infinite',
              transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
              '&:hover': {
                bgcolor: 'secondary.light',
                transform: 'translateY(-4px) scale(1.04)',
                boxShadow: '0 23px 50px rgba(0,0,0,.34)'
              },
              '@keyframes chat-fab-breathe': {
                '0%, 100%': {boxShadow: '0 18px 42px rgba(0,0,0,.28), 0 0 0 0 rgba(246,173,50,.34)'},
                '50%': {boxShadow: '0 18px 42px rgba(0,0,0,.28), 0 0 0 10px rgba(246,173,50,0)'}
              },
              '@media (prefers-reduced-motion: reduce)': {animation: 'none'}
            }}
          >
            <UiIcon name="chat" sx={{fontSize: 29}}/>
          </IconButton>
        </Box>
      </Fade>

      <Fade
        in={open}
        timeout={{enter: 220, exit: 160}}
        mountOnEnter
        unmountOnExit
      >
        <Paper
          role="dialog"
          aria-modal="false"
          aria-labelledby="chatbot-title"
          elevation={20}
          sx={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            width: 'min(360px, calc(100vw - 24px))',
            height: 'min(520px, calc(100dvh - 24px))',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,.16)',
            borderRadius: '14px',
            boxShadow: '0 24px 65px rgba(0,0,0,.22)',
            '@media (prefers-reduced-motion: reduce)': {
              '&, & *': {animationDuration: '1ms !important', scrollBehavior: 'auto !important'}
            }
          }}
        >
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              px: 1.6,
              py: 1.25,
              color: 'common.white',
              background: 'linear-gradient(120deg, #101010 0%, #2a2a2a 100%)',
              borderBottom: '3px solid',
              borderColor: 'secondary.main',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: 84,
                height: 84,
                right: -42,
                top: -50,
                borderRadius: '50%',
                border: '18px solid rgba(255,255,255,.06)'
              }
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: '#151515',
                    boxShadow: '0 7px 16px rgba(0,0,0,.16)'
                  }}
                >
                  <UiIcon name="chat" sx={{fontSize:20}}/>
                </Box>
                <Box>
                  <Typography id="chatbot-title" component="h2" variant="body1" fontWeight={900} lineHeight={1.15}>
                    {t('chat.title')}
                  </Typography>
                  <Stack direction="row" spacing={0.65} alignItems="center" mt={0.3}>
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: '#6ee7a8',
                        boxShadow: '0 0 0 4px rgba(110,231,168,.13)',
                        animation: 'online-pulse 2s ease-in-out infinite',
                        '@keyframes online-pulse': {'50%': {opacity: 0.55}}
                      }}
                    />
                    <Typography variant="caption" sx={{color:'rgba(255,255,255,.68)',fontSize:11.5}}>
                      {t('chat.subtitle')}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              <IconButton
                onClick={close}
                aria-label={t('chat.close')}
                sx={{width:34,height:34,color:'common.white',bgcolor:'rgba(255,255,255,.08)','&:hover':{bgcolor:'rgba(255,255,255,.16)',transform:'rotate(6deg)'}}}
              >
                <UiIcon name="close" sx={{fontSize:20}}/>
              </IconButton>
            </Stack>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1.4,
              backgroundColor: '#f7f7f5',
              backgroundImage:'radial-gradient(rgba(0,0,0,.055) 1px, transparent 1px)',
              backgroundSize:'18px 18px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0,0,0,.24) transparent'
            }}
          >
            <Stack role="log" aria-live="polite" aria-busy={loading} spacing={1.15}>
              {messages.map(message => <Message key={message.id} message={message} t={t}/>)}
              {messages.length === 1 && (
                <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.55} pl={4.35} pt={0.1}>
                  {suggestions.map(suggestion => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="small"
                      onClick={() => submit(suggestion)}
                      clickable
                      sx={{
                        height:'auto',border:'1px solid rgba(246,173,50,.58)',bgcolor:'rgba(255,242,213,.72)',
                        boxShadow:'0 4px 12px rgba(0,0,0,.035)',
                        '& .MuiChip-label':{px:1.15,py:0.55,whiteSpace:'normal',fontSize:12,fontWeight:650},
                        '&:hover':{borderColor:'secondary.dark',bgcolor:'secondary.light',transform:'translateY(-1px)'}
                      }}
                    />
                  ))}
                </Stack>
              )}
              {loading && <TypingIndicator label={t('chat.loading')}/>}
              {error && <Alert severity="error">{error}</Alert>}
              <Box ref={messagesEndRef}/>
            </Stack>
          </Box>

          <Divider/>
          <Box
            component="form"
            onSubmit={event => {
              event.preventDefault();
              submit(input);
            }}
            sx={{p:1.15,bgcolor:'background.paper'}}
          >
            <Stack direction="row" spacing={0.75} alignItems="flex-end">
              <TextField
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder={t('chat.input')}
                aria-label={t('chat.input')}
                inputProps={{maxLength: 800}}
                disabled={loading}
                fullWidth
                multiline
                maxRows={3}
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root':{borderRadius:2,bgcolor:'#fbfbfa',fontSize:13.5},
                  '& .MuiOutlinedInput-notchedOutline':{borderColor:'rgba(0,0,0,.16)'},
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':{borderColor:'rgba(0,0,0,.42)'}
                }}
              />
              <IconButton
                type="submit"
                aria-label={t('chat.send')}
                disabled={loading || input.trim().length < 2}
                sx={{
                  width:40,height:40,flex:'0 0 auto',bgcolor:'primary.main',color:'common.white',
                  boxShadow:'0 7px 16px rgba(0,0,0,.16)',
                  transition:'transform 160ms ease, background-color 160ms ease',
                  '&:hover':{bgcolor:'primary.dark',transform:'translateY(-2px)'},
                  '&.Mui-disabled':{bgcolor:'rgba(246,173,50,.2)',color:'rgba(0,0,0,.32)',boxShadow:'none'}
                }}
              >
                <UiIcon name="send" fontSize="small"/>
              </IconButton>
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.45} px={0.25}>
              <Button
                size="small"
                color="inherit"
                onClick={clear}
                disabled={loading || messages.length === 1}
                sx={{minWidth:0,p:0,fontSize:11,fontWeight:650,color:'text.secondary','&:hover':{color:'error.main',bgcolor:'transparent'}}}
              >
                {t('chat.clear')}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{fontSize:10.5,letterSpacing:.2}}>AI · Catalog</Typography>
            </Stack>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}
