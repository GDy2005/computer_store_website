import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  adminErrorMessage,
  fetchDashboardAnalytics,
  fetchDashboardSummary
} from '../../features/admin/adminApi.js';
import AnalyticsChart from '../../features/admin/AnalyticsChart.jsx';
import {AdminLoading, AdminPageHeader} from '../../features/admin/AdminUi.jsx';
import {
  formatAdminDate,
  formatAdminMoney,
  formatAdminNumber
} from '../../features/admin/adminFormat.js';

const periodOptions = [
  ['year', 'Năm hiện tại'],
  ['quarter', 'Quý hiện tại'],
  ['month', 'Tháng hiện tại'],
  ['week', 'Tuần hiện tại'],
  ['custom', 'Khoảng tùy chọn']
];

function compactNumber(value) {
  return new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function metricCards(summary) {
  return [
    ['Tổng người dùng', formatAdminNumber(summary.totalUsers)],
    ['Người dùng mới', formatAdminNumber(summary.newUsers)],
    ['Tổng đơn hợp lệ', formatAdminNumber(summary.totalOrders)],
    ['Doanh thu', formatAdminMoney(summary.revenue)],
    ['Lợi nhuận', formatAdminMoney(summary.profit)],
    ['Sản phẩm đã bán', formatAdminNumber(summary.productsSold)]
  ];
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [draft, setDraft] = useState({period: 'month', startDate: '', endDate: ''});
  const [query, setQuery] = useState({period: 'month'});
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setSummaryLoading(true);
    fetchDashboardSummary({signal: controller.signal})
      .then(setSummary)
      .catch(error => {
        const message = adminErrorMessage(error, 'Không thể tải dashboard tổng quan.');
        if (message) setSummaryError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setAnalyticsLoading(true);
    setAnalyticsError('');
    fetchDashboardAnalytics(query, {signal: controller.signal})
      .then(setAnalytics)
      .catch(error => {
        const message = adminErrorMessage(error, 'Không thể tải dữ liệu phân tích.');
        if (message) setAnalyticsError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  const categoryMax = useMemo(() => Math.max(
    1,
    ...(analytics?.categoryBreakdown || []).map(item => Number(item.revenue || 0))
  ), [analytics]);

  function applyPeriod(event) {
    event.preventDefault();
    setValidationError('');

    if (draft.period === 'custom') {
      if (!draft.startDate || !draft.endDate) {
        setValidationError('Hãy chọn đủ ngày bắt đầu và ngày kết thúc.');
        return;
      }
      if (draft.startDate > draft.endDate) {
        setValidationError('Ngày bắt đầu không được sau ngày kết thúc.');
        return;
      }
    }

    setQuery(draft.period === 'custom'
      ? {...draft}
      : {period: draft.period});
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Dashboard"
        description="Tổng quan kinh doanh và phân tích theo khoảng thời gian từ Analytics Service."
      />

      {summaryError && <Alert severity="error">{summaryError}</Alert>}
      {summaryLoading && <AdminLoading label="Đang tải số liệu tổng quan"/>}
      {!summaryLoading && summary && (
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)'}, gap: 2}}>
          {metricCards(summary).map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{p: 2.5}}>
              <Typography color="text.secondary" variant="body2">{label}</Typography>
              <Typography variant="h5" fontWeight={900} sx={{mt: 0.5}}>{value}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {!summaryLoading && summary && (
        <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
          <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={1} mb={2}>
            <Box>
              <Typography component="h2" variant="h6" fontWeight={850}>Sản phẩm bán chạy</Typography>
              <Typography variant="body2" color="text.secondary">Tính từ các đơn hợp lệ, không gồm đơn đã hủy.</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Cập nhật {formatAdminDate(summary.updatedAt)}
            </Typography>
          </Stack>
          {(summary.bestSellers || []).length === 0 ? (
            <Alert severity="info">Chưa có dữ liệu bán hàng.</Alert>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="Sản phẩm bán chạy">
                <TableHead>
                  <TableRow>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>Danh mục</TableCell>
                    <TableCell align="right">Số lượng</TableCell>
                    <TableCell align="right">Doanh thu</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.bestSellers.map(item => (
                    <TableRow key={item.productId || item.productName}>
                      <TableCell sx={{fontWeight: 700}}>{item.productName}</TableCell>
                      <TableCell>{item.categoryName || '—'}</TableCell>
                      <TableCell align="right">{formatAdminNumber(item.quantity)}</TableCell>
                      <TableCell align="right">{formatAdminMoney(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Paper component="form" onSubmit={applyPeriod} variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
        <Typography component="h2" variant="h6" fontWeight={850}>Phân tích nâng cao</Typography>
        <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems={{md: 'center'}} sx={{mt: 2}}>
          <FormControl sx={{minWidth: 210}}>
            <InputLabel id="analytics-period-label">Khoảng thời gian</InputLabel>
            <Select
              labelId="analytics-period-label"
              label="Khoảng thời gian"
              value={draft.period}
              onChange={event => setDraft(current => ({...current, period: event.target.value}))}
            >
              {periodOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          {draft.period === 'custom' && (
            <>
              <TextField
                label="Từ ngày"
                type="date"
                value={draft.startDate}
                onChange={event => setDraft(current => ({...current, startDate: event.target.value}))}
                InputLabelProps={{shrink: true}}
              />
              <TextField
                label="Đến ngày"
                type="date"
                value={draft.endDate}
                onChange={event => setDraft(current => ({...current, endDate: event.target.value}))}
                InputLabelProps={{shrink: true}}
              />
            </>
          )}
          <Button type="submit" variant="contained" size="large">Áp dụng</Button>
        </Stack>
        {validationError && <Alert severity="warning" sx={{mt: 2}}>{validationError}</Alert>}
      </Paper>

      {analyticsError && <Alert severity="error">{analyticsError}</Alert>}
      {analyticsLoading && <AdminLoading label="Đang tổng hợp dữ liệu phân tích"/>}
      {!analyticsLoading && analytics && (
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${analytics.range?.startDate || '—'} → ${analytics.range?.endDate || '—'}`} variant="outlined"/>
            <Chip label={`${formatAdminNumber(analytics.totals?.orders)} đơn`} color="primary" variant="outlined"/>
            <Chip label={`${formatAdminNumber(analytics.totals?.productsSold)} sản phẩm`} color="secondary" variant="outlined"/>
          </Stack>

          <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))'}, gap: 3}}>
            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, minWidth: 0}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Doanh thu và lợi nhuận</Typography>
              <AnalyticsChart
                title="Biểu đồ doanh thu và lợi nhuận theo thời gian"
                series={analytics.series || []}
                lines={[
                  {key: 'revenue', label: 'Doanh thu', color: '#173f35'},
                  {key: 'profit', label: 'Lợi nhuận', color: '#d79537'}
                ]}
                valueFormatter={compactNumber}
              />
            </Paper>
            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, minWidth: 0}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Đơn hàng và sản lượng</Typography>
              <AnalyticsChart
                title="Biểu đồ đơn hàng và số lượng sản phẩm theo thời gian"
                series={analytics.series || []}
                lines={[
                  {key: 'orders', label: 'Đơn hàng', color: '#316b83'},
                  {key: 'productsSold', label: 'Sản phẩm', color: '#9b5b23'}
                ]}
                valueFormatter={value => formatAdminNumber(Math.round(value))}
              />
            </Paper>
          </Box>

          <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', lg: 'minmax(0, 0.9fr) minmax(0, 1.1fr)'}, gap: 3}}>
            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Doanh thu theo danh mục</Typography>
              <Stack spacing={2}>
                {(analytics.categoryBreakdown || []).length === 0 && <Typography color="text.secondary">Chưa có dữ liệu.</Typography>}
                {(analytics.categoryBreakdown || []).map(item => (
                  <Box key={item.categoryName}>
                    <Stack direction="row" justifyContent="space-between" gap={2}>
                      <Typography fontWeight={700}>{item.categoryName}</Typography>
                      <Typography variant="body2">{formatAdminMoney(item.revenue)}</Typography>
                    </Stack>
                    <Box sx={{height: 8, bgcolor: 'action.hover', borderRadius: 4, mt: 0.75, overflow: 'hidden'}}>
                      <Box sx={{width: `${Math.max(2, Number(item.revenue || 0) / categoryMax * 100)}%`, height: '100%', bgcolor: 'primary.main'}}/>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatAdminNumber(item.quantity)} sản phẩm · Lợi nhuận {formatAdminMoney(item.profit)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, minWidth: 0}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>Chi tiết theo sản phẩm</Typography>
              {(analytics.productBreakdown || []).length === 0 ? (
                <Typography color="text.secondary">Chưa có dữ liệu.</Typography>
              ) : (
                <TableContainer sx={{maxHeight: 360}}>
                  <Table size="small" stickyHeader aria-label="Chi tiết doanh thu theo sản phẩm">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sản phẩm</TableCell>
                        <TableCell align="right">SL</TableCell>
                        <TableCell align="right">Doanh thu</TableCell>
                        <TableCell align="right">Lợi nhuận</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.productBreakdown.map(item => (
                        <TableRow key={item.productId || item.productName}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>{item.productName}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.categoryName}</Typography>
                          </TableCell>
                          <TableCell align="right">{formatAdminNumber(item.quantity)}</TableCell>
                          <TableCell align="right">{formatAdminMoney(item.revenue)}</TableCell>
                          <TableCell align="right">{formatAdminMoney(item.profit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
