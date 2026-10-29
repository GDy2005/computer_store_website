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
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import {useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {useTheme} from '@mui/material/styles';

import {formatProductPrice} from '../products/productFormat.js';
import {chatErrorMessage, sendChatMessage} from './chatApi.js';

const suggestions = [
  'Laptop học tập dưới 25 triệu',
  'Chuột gaming không dây',
  'Màn hình QHD khoảng 10 triệu'
];

const welcome = {
  id: 'welcome',
  role: 'assistant',
  text: 'Chào bạn! Hãy cho mình biết loại sản phẩm, ngân sách, thương hiệu hoặc nhu cầu sử dụng.'
};

function Message({message}) {
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
                    Xem sản phẩm
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
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const controller = useRef(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([welcome]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setMessages([welcome]);
    setError('');
  }

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => setOpen(true)}
        aria-label="Mở trợ lý tư vấn sản phẩm"
        sx={{
          position: 'fixed',
          right: {xs: 16, md: 28},
          bottom: {xs: 16, md: 28},
          zIndex: theme.zIndex.appBar,
          px: 2.25,
          py: 1.25,
          boxShadow: '0 12px 30px rgba(23,63,53,0.24)'
        }}
      >
        Tư vấn AI
      </Button>
      <Dialog
        open={open}
        onClose={close}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="sm"
        aria-labelledby="chatbot-title"
        slotProps={{paper: {sx: {height: fullScreen ? '100%' : 'min(720px, 86vh)'}}}}
      >
        <DialogTitle id="chatbot-title" sx={{pb: 1}}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography component="span" variant="h6" fontWeight={850}>
                Trợ lý chọn sản phẩm
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Gợi ý dựa trên dữ liệu thật của cửa hàng
              </Typography>
            </Box>
            <IconButton onClick={close} aria-label="Đóng trợ lý">×</IconButton>
          </Stack>
        </DialogTitle>
        <Divider/>
        <DialogContent sx={{display: 'flex', flexDirection: 'column', gap: 1.5, p: 2}}>
          <Stack role="log" aria-live="polite" aria-busy={loading} spacing={1.5}>
            {messages.map(message => <Message key={message.id} message={message}/>)}
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
              <Typography variant="body2">Đang tìm trong catalog…</Typography>
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{flexGrow: 1}}/>
          <Typography variant="caption" color="text.secondary">
            Trợ lý không lưu hội thoại và không xác nhận tồn kho. Hãy kiểm tra trang chi tiết trước khi đặt hàng.
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
              label="Bạn đang cần sản phẩm nào?"
              inputProps={{maxLength: 800}}
              disabled={loading}
              fullWidth
              multiline
              maxRows={3}
            />
            <Button type="submit" variant="contained" disabled={loading || input.trim().length < 2} sx={{width:{xs:'100%',sm:'auto'}}}>
              Gửi
            </Button>
          </Stack>
        </Box>
        <DialogActions sx={{px: 2, py: 1, justifyContent: 'flex-start'}}>
          <Button size="small" color="inherit" onClick={clear} disabled={loading}>
            Xóa hội thoại
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
