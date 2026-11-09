import {
  Box,
  Button,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import {useLanguage} from '../i18n/LanguageContext.jsx';

export function AdminPageHeader({eyebrow, title, description, action}) {
  const {t} = useLanguage();
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: {xs: 2.5, sm: 3.25},
        color: 'common.white',
        border: '0 !important',
        background: 'linear-gradient(120deg, #17382b 0%, #224b3a 62%, #36543d 100%)',
        boxShadow: '0 14px 34px rgba(20,57,43,.16)',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 190,
          height: 190,
          right: -35,
          top: -120,
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: '50%'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 92,
          height: 92,
          right: 115,
          bottom: -72,
          border: '1px solid rgba(246,173,50,.26)',
          borderRadius: '50%'
        },
        '& .MuiButton-contained': {bgcolor: 'secondary.main', color: '#171717'},
        '& .MuiButton-contained:hover': {bgcolor: 'secondary.dark'},
        '& .MuiButton-text': {color: 'common.white'}
      }}
    >
      <Stack
        direction={{xs: 'column', sm: 'row'}}
        justifyContent="space-between"
        alignItems={{sm: 'flex-end'}}
        gap={2}
        sx={{position: 'relative', zIndex: 1}}
      >
        <Box>
          <Typography component="p" variant="overline" sx={{color: 'secondary.main'}} fontWeight={900}>
            {eyebrow || t('admin.common.eyebrow')}
          </Typography>
          <Typography component="h1" variant="h4" fontWeight={900}>{title}</Typography>
          {description && <Typography sx={{mt: 0.75, color: 'rgba(255,255,255,.7)'}}>{description}</Typography>}
        </Box>
        {action}
      </Stack>
    </Paper>
  );
}

export function AdminLoading({label}) {
  const {t} = useLanguage();
  const resolvedLabel = label || t('admin.common.loading');
  return (
    <Box sx={{display: 'grid', placeItems: 'center', minHeight: 240}}>
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress aria-label={resolvedLabel}/>
        <Typography color="text.secondary" variant="body2">{resolvedLabel}</Typography>
      </Stack>
    </Box>
  );
}

export function AdminEmpty({children}) {
  const {t} = useLanguage();
  return (
    <Paper variant="outlined" sx={{p: 4, textAlign: 'center'}}>
      <Typography color="text.secondary">{children || t('admin.common.empty')}</Typography>
    </Paper>
  );
}

export function AdminPagination({meta, page, onChange, disabled = false}) {
  const {locale, t} = useLanguage();
  const totalPages = Math.max(1, Number(meta?.totalPages || 1));
  const safePage = Math.min(Math.max(1, Number(page || 1)), totalPages);

  return (
    <Stack alignItems="center" spacing={1} sx={{pt: 1}}>
      <Pagination
        count={totalPages}
        page={safePage}
        onChange={onChange}
        disabled={disabled}
        color="primary"
        showFirstButton
        showLastButton
      />
      <Typography variant="caption" color="text.secondary">
        {t('admin.common.pagination', {
          current: safePage,
          total: totalPages,
          count: Number(meta?.totalItems || 0).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN')
        })}
      </Typography>
    </Stack>
  );
}

export function DangerButton({children, ...props}) {
  return <Button color="error" variant="outlined" {...props}>{children}</Button>;
}
