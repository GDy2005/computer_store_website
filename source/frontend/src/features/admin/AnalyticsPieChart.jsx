import {Box, Stack, Typography} from '@mui/material';

const COLORS = ['#f6ad32', '#242424', '#7b7b76', '#cf8100', '#a8a8a2', '#6a4a16'];

export default function AnalyticsPieChart({
  data,
  title,
  labelKey = 'label',
  valueKey = 'value',
  valueFormatter = value => String(value),
  centerFormatter = valueFormatter,
  detailFormatter,
  emptyLabel = 'Chưa có dữ liệu trong khoảng thời gian này.',
  totalLabel = 'Tổng doanh thu'
}) {
  const items = (data || [])
    .map((item, index) => ({
      ...item,
      chartValue: Math.max(0, Number(item[valueKey] || 0)),
      color: COLORS[index % COLORS.length]
    }))
    .filter(item => item.chartValue > 0);
  const total = items.reduce((sum, item) => sum + item.chartValue, 0);

  if (!items.length || total <= 0) {
    return <Typography color="text.secondary">{emptyLabel}</Typography>;
  }

  let consumed = 0;
  const segments = items.map(item => {
    const percentage = item.chartValue / total * 100;
    const segment = {...item, percentage, offset: consumed};
    consumed += percentage;
    return segment;
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {xs: '1fr', sm: '220px minmax(0, 1fr)'},
        gap: {xs: 2.5, sm: 3},
        alignItems: 'center'
      }}
    >
      <Box sx={{display: 'grid', placeItems: 'center'}}>
        <Box
          component="svg"
          viewBox="0 0 220 220"
          role="img"
          aria-label={title}
          sx={{width: '100%', maxWidth: 220, height: 'auto', overflow: 'visible'}}
        >
          <circle cx="110" cy="110" r="76" fill="none" stroke="#edf0f3" strokeWidth="28"/>
          {segments.map(item => (
            <circle
              key={item[labelKey]}
              cx="110"
              cy="110"
              r="76"
              pathLength="100"
              fill="none"
              stroke={item.color}
              strokeWidth="28"
              strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
              strokeDashoffset={-item.offset}
              strokeLinecap={item.percentage >= 99.99 ? 'butt' : 'round'}
              transform="rotate(-90 110 110)"
            >
              <title>{`${item[labelKey]}: ${valueFormatter(item.chartValue)} (${item.percentage.toFixed(1)}%)`}</title>
            </circle>
          ))}
          <text x="110" y="101" textAnchor="middle" fontSize="12" fill="#69717d">{totalLabel}</text>
          <text x="110" y="124" textAnchor="middle" fontSize="17" fontWeight="800" fill="#24272b">
            {centerFormatter(total)}
          </text>
        </Box>
      </Box>

      <Stack spacing={1.25}>
        {segments.map(item => (
          <Box
            key={item[labelKey]}
            sx={{
              display: 'grid',
              gridTemplateColumns: '12px minmax(0, 1fr) auto',
              columnGap: 1,
              alignItems: 'center',
              py: 0.75,
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: item.color}}/>
            <Box sx={{minWidth: 0}}>
              <Typography variant="body2" fontWeight={750} noWrap>{item[labelKey]}</Typography>
              {detailFormatter && (
                <Typography variant="caption" color="text.secondary">
                  {detailFormatter(item)}
                </Typography>
              )}
            </Box>
            <Box sx={{textAlign: 'right'}}>
              <Typography variant="body2" fontWeight={800}>{item.percentage.toFixed(1)}%</Typography>
              <Typography variant="caption" color="text.secondary">{valueFormatter(item.chartValue)}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
