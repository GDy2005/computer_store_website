import {useEffect, useState} from 'react';
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
import AnalyticsPieChart from '../../features/admin/AnalyticsPieChart.jsx';
import {AdminLoading, AdminPageHeader} from '../../features/admin/AdminUi.jsx';
import {useLanguage} from '../../features/i18n/LanguageContext.jsx';
import {
  formatAdminDate,
  formatAdminMoney,
  formatAdminNumber
} from '../../features/admin/adminFormat.js';
import UiIcon from '../../components/UiIcon.jsx';

function compactNumber(value, locale = 'vi') {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function metricCards(summary, t, locale) {
  return [
    {label: t('admin.dashboard.metrics.totalUsers'), value: formatAdminNumber(summary.totalUsers, locale), icon: 'people', color: '#292929', background: '#eeeeeb'},
    {label: t('admin.dashboard.metrics.newUsers'), value: formatAdminNumber(summary.newUsers, locale), icon: 'user', color: '#9a6100', background: '#fff2d5'},
    {label: t('admin.dashboard.metrics.totalOrders'), value: formatAdminNumber(summary.totalOrders, locale), icon: 'receipt', color: '#4d4d49', background: '#f0f0ed'},
    {label: t('admin.dashboard.metrics.revenue'), value: formatAdminMoney(summary.revenue, locale), icon: 'dashboard', color: '#9a6100', background: '#fff2d5'},
    {label: t('admin.dashboard.metrics.profit'), value: formatAdminMoney(summary.profit, locale), icon: 'coupon', color: '#292929', background: '#eeeeeb'},
    {label: t('admin.dashboard.metrics.productsSold'), value: formatAdminNumber(summary.productsSold, locale), icon: 'package', color: '#9a6100', background: '#fff6e4'}
  ];
}

export default function AdminDashboardPage() {
  const {locale, t} = useLanguage();
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
        const message = adminErrorMessage(error, t('admin.dashboard.errors.summary'));
        if (message) setSummaryError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });
    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    setAnalyticsLoading(true);
    setAnalyticsError('');
    fetchDashboardAnalytics(query, {signal: controller.signal})
      .then(setAnalytics)
      .catch(error => {
        const message = adminErrorMessage(error, t('admin.dashboard.errors.analytics'));
        if (message) setAnalyticsError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });
    return () => controller.abort();
  }, [query, t]);

  function applyPeriod(event) {
    event.preventDefault();
    setValidationError('');

    if (draft.period === 'custom') {
      if (!draft.startDate || !draft.endDate) {
        setValidationError(t('admin.dashboard.validation.missingDates'));
        return;
      }
      if (draft.startDate > draft.endDate) {
        setValidationError(t('admin.dashboard.validation.dateOrder'));
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
        eyebrow={t('admin.common.eyebrow')}
        title={t('admin.dashboard.title')}
        description={t('admin.dashboard.description')}
      />

      {summaryError && <Alert severity="error">{summaryError}</Alert>}
      {summaryLoading && <AdminLoading label={t('admin.dashboard.loading.summary')}/>}
      {!summaryLoading && summary && (
        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)'}, gap: 2}}>
          {metricCards(summary, t, locale).map(metric => (
            <Paper key={metric.label} variant="outlined" sx={{p: 2.5, boxShadow: '0 7px 22px rgba(31,41,55,.05)', transition: 'transform 180ms ease, box-shadow 180ms ease', '&:hover': {transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(31,41,55,.1)'}}}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight={650}>{metric.label}</Typography>
                  <Typography variant="h5" fontWeight={900} sx={{mt: 0.65}}>{metric.value}</Typography>
                </Box>
                <Box sx={{display: 'grid', width: 48, height: 48, flexShrink: 0, placeItems: 'center', borderRadius: 2.5, bgcolor: metric.background, color: metric.color}}>
                  <UiIcon name={metric.icon}/>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      {!summaryLoading && summary && (
        <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
          <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={1} mb={2}>
            <Box>
              <Typography component="h2" variant="h6" fontWeight={850}>{t('admin.dashboard.bestSellers.title')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('admin.dashboard.bestSellers.description')}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t('admin.dashboard.bestSellers.updated', {date: formatAdminDate(summary.updatedAt, {locale})})}
            </Typography>
          </Stack>
          {(summary.bestSellers || []).length === 0 ? (
            <Alert severity="info">{t('admin.dashboard.bestSellers.empty')}</Alert>
          ) : (
            <TableContainer>
              <Table size="small" aria-label={t('admin.dashboard.bestSellers.aria')}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('admin.dashboard.table.product')}</TableCell>
                    <TableCell>{t('admin.dashboard.table.category')}</TableCell>
                    <TableCell align="right">{t('admin.dashboard.table.quantity')}</TableCell>
                    <TableCell align="right">{t('admin.dashboard.table.revenue')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.bestSellers.map(item => (
                    <TableRow key={item.productId || item.productName}>
                      <TableCell sx={{fontWeight: 700}}>{item.productName}</TableCell>
                      <TableCell>{item.categoryName || '—'}</TableCell>
                      <TableCell align="right">{formatAdminNumber(item.quantity, locale)}</TableCell>
                      <TableCell align="right">{formatAdminMoney(item.revenue, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Paper component="form" onSubmit={applyPeriod} variant="outlined" sx={{p: {xs: 2, sm: 3}, bgcolor: 'secondary.light'}}>
        <Typography component="h2" variant="h6" fontWeight={850}>{t('admin.dashboard.analytics.title')}</Typography>
        <Stack direction={{xs: 'column', md: 'row'}} spacing={2} alignItems={{md: 'center'}} sx={{mt: 2}}>
          <FormControl sx={{minWidth: 210}}>
            <InputLabel id="analytics-period-label">{t('admin.dashboard.analytics.period')}</InputLabel>
            <Select
              labelId="analytics-period-label"
              label={t('admin.dashboard.analytics.period')}
              value={draft.period}
              onChange={event => setDraft(current => ({...current, period: event.target.value}))}
            >
              {['year', 'quarter', 'month', 'week', 'custom'].map(value => (
                <MenuItem key={value} value={value}>{t(`admin.dashboard.period.${value}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {draft.period === 'custom' && (
            <>
              <TextField
                label={t('admin.dashboard.analytics.startDate')}
                type="date"
                value={draft.startDate}
                onChange={event => setDraft(current => ({...current, startDate: event.target.value}))}
                InputLabelProps={{shrink: true}}
              />
              <TextField
                label={t('admin.dashboard.analytics.endDate')}
                type="date"
                value={draft.endDate}
                onChange={event => setDraft(current => ({...current, endDate: event.target.value}))}
                InputLabelProps={{shrink: true}}
              />
            </>
          )}
          <Button type="submit" variant="contained" size="large">{t('admin.dashboard.analytics.apply')}</Button>
        </Stack>
        {validationError && <Alert severity="warning" sx={{mt: 2}}>{validationError}</Alert>}
      </Paper>

      {analyticsError && <Alert severity="error">{analyticsError}</Alert>}
      {analyticsLoading && <AdminLoading label={t('admin.dashboard.loading.analytics')}/>}
      {!analyticsLoading && analytics && (
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${analytics.range?.startDate || '—'} → ${analytics.range?.endDate || '—'}`} variant="outlined"/>
            <Chip label={t('admin.dashboard.analytics.orderCount', {count: formatAdminNumber(analytics.totals?.orders, locale)})} color="primary" variant="outlined"/>
            <Chip label={t('admin.dashboard.analytics.productCount', {count: formatAdminNumber(analytics.totals?.productsSold, locale)})} color="secondary" variant="outlined"/>
          </Stack>

          <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))'}, gap: 3}}>
            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, minWidth: 0}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.dashboard.charts.revenueProfit')}</Typography>
              <AnalyticsChart
                title={t('admin.dashboard.charts.revenueProfitAria')}
                series={analytics.series || []}
                lines={[
                  {key: 'revenue', label: t('admin.dashboard.metrics.revenue'), color: '#f6ad32'},
                  {key: 'profit', label: t('admin.dashboard.metrics.profit'), color: '#202020'}
                ]}
                valueFormatter={value => compactNumber(value, locale)}
                emptyLabel={t('admin.dashboard.charts.empty')}
              />
            </Paper>
            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, minWidth: 0}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.dashboard.charts.ordersProducts')}</Typography>
              <AnalyticsChart
                title={t('admin.dashboard.charts.ordersProductsAria')}
                series={analytics.series || []}
                lines={[
                  {key: 'orders', label: t('admin.dashboard.charts.orders'), color: '#6b6b68'},
                  {key: 'productsSold', label: t('admin.dashboard.charts.products'), color: '#cf8100'}
                ]}
                valueFormatter={value => formatAdminNumber(Math.round(value), locale)}
                emptyLabel={t('admin.dashboard.charts.empty')}
              />
            </Paper>
          </Box>

          <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', lg: 'minmax(0, 0.9fr) minmax(0, 1.1fr)'}, gap: 3}}>
            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.dashboard.charts.categoryRevenue')}</Typography>
              <AnalyticsPieChart
                title={t('admin.dashboard.charts.categoryRevenueAria')}
                data={analytics.categoryBreakdown || []}
                labelKey="categoryName"
                valueKey="revenue"
                valueFormatter={value => formatAdminMoney(value, locale)}
                centerFormatter={value => compactNumber(value, locale)}
                detailFormatter={item => t('admin.dashboard.charts.categoryDetail', {
                  count: formatAdminNumber(item.quantity, locale),
                  profit: formatAdminMoney(item.profit, locale)
                })}
                emptyLabel={t('admin.dashboard.charts.empty')}
                totalLabel={t('admin.dashboard.charts.totalRevenue')}
              />
            </Paper>

            <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, minWidth: 0}}>
              <Typography component="h2" variant="h6" fontWeight={850} mb={2}>{t('admin.dashboard.productDetail.title')}</Typography>
              {(analytics.productBreakdown || []).length === 0 ? (
                <Typography color="text.secondary">{t('admin.dashboard.productDetail.empty')}</Typography>
              ) : (
                <TableContainer sx={{maxHeight: 360}}>
                  <Table size="small" stickyHeader aria-label={t('admin.dashboard.productDetail.aria')}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('admin.dashboard.table.product')}</TableCell>
                        <TableCell align="right">{t('admin.dashboard.table.quantityShort')}</TableCell>
                        <TableCell align="right">{t('admin.dashboard.table.revenue')}</TableCell>
                        <TableCell align="right">{t('admin.dashboard.table.profit')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.productBreakdown.map(item => (
                        <TableRow key={item.productId || item.productName}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>{item.productName}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.categoryName}</Typography>
                          </TableCell>
                          <TableCell align="right">{formatAdminNumber(item.quantity, locale)}</TableCell>
                          <TableCell align="right">{formatAdminMoney(item.revenue, locale)}</TableCell>
                          <TableCell align="right">{formatAdminMoney(item.profit, locale)}</TableCell>
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
