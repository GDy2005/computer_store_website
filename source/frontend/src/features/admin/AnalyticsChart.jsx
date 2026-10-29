import {Box, Stack, Typography} from '@mui/material';

const WIDTH = 720;
const HEIGHT = 250;
const LEFT = 52;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 46;

function pointsFor(series, key, maxValue) {
  const usableWidth = WIDTH - LEFT - RIGHT;
  const usableHeight = HEIGHT - TOP - BOTTOM;
  const divisor = Math.max(1, series.length - 1);

  return series.map((item, index) => {
    const x = LEFT + usableWidth * index / divisor;
    const y = TOP + usableHeight * (1 - Number(item[key] || 0) / maxValue);
    return `${x},${y}`;
  }).join(' ');
}

export default function AnalyticsChart({series, lines, title, valueFormatter}) {
  if (!series?.length) {
    return <Typography color="text.secondary">Chưa có dữ liệu trong khoảng thời gian này.</Typography>;
  }

  const maxValue = Math.max(
    1,
    ...series.flatMap(item => lines.map(line => Number(item[line.key] || 0)))
  );
  const labelStep = Math.max(1, Math.ceil(series.length / 6));

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {lines.map(line => (
          <Stack key={line.key} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{width: 18, height: 3, bgcolor: line.color, borderRadius: 2}}/>
            <Typography variant="caption">{line.label}</Typography>
          </Stack>
        ))}
      </Stack>
      <Box sx={{width: '100%', overflowX: 'auto'}}>
        <Box
          component="svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={title}
          sx={{display: 'block', width: '100%', minWidth: 560, height: 'auto'}}
        >
          {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
            const y = TOP + (HEIGHT - TOP - BOTTOM) * fraction;
            const value = maxValue * (1 - fraction);
            return (
              <g key={fraction}>
                <line x1={LEFT} y1={y} x2={WIDTH - RIGHT} y2={y} stroke="#dfe4df" strokeWidth="1"/>
                <text x={LEFT - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#647067">
                  {valueFormatter(value, {compact: true})}
                </text>
              </g>
            );
          })}
          {lines.map(line => (
            <polyline
              key={line.key}
              points={pointsFor(series, line.key, maxValue)}
              fill="none"
              stroke={line.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {series.map((item, index) => {
            if (index % labelStep !== 0 && index !== series.length - 1) return null;
            const divisor = Math.max(1, series.length - 1);
            const x = LEFT + (WIDTH - LEFT - RIGHT) * index / divisor;
            return (
              <text key={`${item.date || item.label}-${index}`} x={x} y={HEIGHT - 15} textAnchor="middle" fontSize="10" fill="#647067">
                {item.label || item.date}
              </text>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}
