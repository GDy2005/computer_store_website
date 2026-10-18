import {useEffect, useMemo, useState} from 'react';
import {
  Alert, Box, Chip, CircularProgress, Pagination,
  Paper, Stack, Typography
} from '@mui/material';
import {useSearchParams} from 'react-router-dom';
import {fetchLoyalty} from '../../features/loyalty/loyaltyApi.js';
import {formatOrderDate} from '../../features/orders/orderApi.js';

const typeLabels = {EARN: 'Cộng điểm', REDEEM: 'Đổi điểm', REFUND: 'Hoàn điểm'};
const typeColors = {EARN: 'success', REDEEM: 'warning', REFUND: 'info'};

export default function LoyaltyPage() {
  const [params, setParams] = useSearchParams();
  const page = useMemo(() => {
    const value = Number(params.get('page') || 1);
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  }, [params.toString()]);
  const [result, setResult] = useState({
    pointsBalance: 0,
    transactions: [],
    meta: {totalPages: 1}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchLoyalty(page, {signal: controller.signal})
      .then(setResult)
      .catch(requestError => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.error?.message || 'Không thể tải điểm thưởng.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page]);

  return (
    <Stack spacing={3} maxWidth={820} mx="auto">
      <Box>
        <Typography component="p" variant="overline" color="secondary.main" fontWeight={800}>Loyalty</Typography>
        <Typography component="h1" variant="h4" fontWeight={850}>Điểm thưởng</Typography>
      </Box>
      <Paper variant="outlined" sx={{p: 3}}>
        <Typography color="text.secondary">Số dư hiện tại</Typography>
        <Typography variant="h3" color="primary.main" fontWeight={900}>{result.pointsBalance} điểm</Typography>
        <Typography variant="body2" color="text.secondary">1 điểm tương đương 1.000 ₫ khi thanh toán.</Typography>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Box sx={{display: 'grid', placeItems: 'center', minHeight: 180}}><CircularProgress/></Box>}
      {!loading && result.transactions.length === 0 && <Alert severity="info">Chưa có giao dịch điểm.</Alert>}
      {!loading && result.transactions.map(transaction => (
        <Paper key={transaction.id} variant="outlined" sx={{p: 2.5}}>
          <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={1}>
            <Box>
              <Typography fontWeight={750}>{transaction.description}</Typography>
              <Typography variant="body2" color="text.secondary">{formatOrderDate(transaction.createdAt)}</Typography>
              <Typography variant="caption" color="text.secondary">Số dư sau giao dịch: {transaction.balanceAfter}</Typography>
            </Box>
            <Stack alignItems={{sm: 'flex-end'}} spacing={1}>
              <Chip size="small" label={typeLabels[transaction.type]} color={typeColors[transaction.type]}/>
              <Typography fontWeight={850} color={transaction.type === 'REDEEM' ? 'error.main' : 'success.main'}>
                {transaction.type === 'REDEEM' ? '−' : '+'}{transaction.points} điểm
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {!loading && (
        <Stack alignItems="center">
          <Pagination
            count={Math.max(1, result.meta.totalPages)}
            page={Math.min(page, Math.max(1, result.meta.totalPages))}
            onChange={(_, value) => setParams(value === 1 ? {} : {page: String(value)})}
          />
        </Stack>
      )}
    </Stack>
  );
}
