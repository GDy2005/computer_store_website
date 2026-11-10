import {Box, Button, Paper, Stack, Typography} from '@mui/material';
import {Link} from 'react-router-dom';

import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import UiIcon from './UiIcon.jsx';

export default function HomeSectionPanel({
  id,
  titleId,
  title,
  description,
  actionTo = '/products',
  icon = 'package',
  children
}) {
  const {t} = useLanguage();

  return (
    <Paper
      id={id}
      component="section"
      aria-labelledby={titleId || undefined}
      aria-label={titleId ? undefined : title}
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '10px',
        borderColor: 'rgba(18, 57, 44, .22)',
        bgcolor: 'common.white',
        boxShadow: '0 12px 34px rgba(18, 57, 44, .09)',
        scrollMarginTop: {xs: 130, md: 150}
      }}
    >
      <Box
        sx={{
          position: 'relative',
          minHeight: {xs: 104, sm: 100},
          px: {xs: 2.25, sm: 3.25},
          pt: {xs: 2.25, sm: 2.5},
          pb: {xs: 2.25, sm: 2.5},
          color: 'secondary.contrastText',
          background: 'linear-gradient(118deg, #101211 0%, #182b23 48%, #245b44 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: {xs: 132, sm: 176},
            height: {xs: 132, sm: 176},
            right: {xs: -35, sm: 16},
            top: {xs: -72, sm: -105},
            border: '1px solid rgba(255,255,255,.16)',
            borderRadius: '50%'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 58,
            height: 58,
            right: {xs: 20, sm: 88},
            bottom: -34,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,.22)',
            filter: 'blur(2px)'
          }
        }}
      >
        <Stack
          direction={{xs: 'column', sm: 'row'}}
          spacing={{xs: 1.5, sm: 3}}
          alignItems={{sm: 'flex-start'}}
          justifyContent="space-between"
          sx={{position: 'relative', zIndex: 1}}
        >
          <Stack direction="row" spacing={1.35} alignItems="center" sx={{maxWidth: 760, pr: {sm: 2}}}>
            <Box
              aria-hidden="true"
              sx={{
                display: 'grid',
                width: 42,
                height: 42,
                flexShrink: 0,
                placeItems: 'center',
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,.1)',
                color: '#b9dfcf',
                border: '1px solid rgba(255,255,255,.16)'
              }}
            >
              <UiIcon name={icon} sx={{fontSize: 23}}/>
            </Box>
            <Box>
              <Typography id={titleId} component="h2" variant="h5" fontWeight={900}>
                {title}
              </Typography>
              {description && (
                <Typography sx={{mt: 0.4, color: 'rgba(255,255,255,.7)', fontWeight: 600}}>
                  {description}
                </Typography>
              )}
            </Box>
          </Stack>
          <Button
            component={Link}
            to={actionTo}
            endIcon={<UiIcon name="arrowRight"/>}
            sx={{
              flexShrink: 0,
              alignSelf: {xs: 'flex-start', sm: 'center'},
              minHeight: 38,
              color: 'common.white',
              border: '1px solid rgba(255,255,255,.38)',
              bgcolor: 'rgba(255,255,255,.08)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,.16)',
                borderColor: 'rgba(255,255,255,.7)'
              }
            }}
          >
            {t('common.viewAll')}
          </Button>
        </Stack>

      </Box>

      <Box
        sx={{
          px: {xs: 1.5, sm: 2.5, md: 3},
          pt: {xs: 2.5, sm: 3},
          pb: {xs: 2, sm: 2.75, md: 3},
          background: 'linear-gradient(180deg, #ffffff 0%, #f4f8f6 100%)'
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}
