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
        borderColor: 'rgba(20, 58, 44, .18)',
        bgcolor: 'common.white',
        boxShadow: '0 12px 34px rgba(28, 46, 37, .08)',
        scrollMarginTop: {xs: 130, md: 150}
      }}
    >
      <Box
        sx={{
          position: 'relative',
          minHeight: {xs: 112, sm: 104},
          px: {xs: 2.25, sm: 3.25},
          pt: {xs: 2.25, sm: 2.5},
          pb: {xs: 4.5, sm: 4},
          color: 'common.white',
          background: 'linear-gradient(118deg, #12392c 0%, #23442f 58%, #344b2d 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            width: {xs: 132, sm: 176},
            height: {xs: 132, sm: 176},
            right: {xs: -35, sm: 16},
            top: {xs: -72, sm: -105},
            border: '1px solid rgba(255,255,255,.14)',
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
            bgcolor: 'rgba(246,173,50,.1)',
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
          <Box sx={{maxWidth: 720, pr: {sm: 2}}}>
            <Typography id={titleId} component="h2" variant="h5" fontWeight={900}>
              {title}
            </Typography>
            {description && (
              <Typography sx={{mt: 0.65, color: 'rgba(255,255,255,.72)'}}>
                {description}
              </Typography>
            )}
          </Box>
          <Button
            component={Link}
            to={actionTo}
            endIcon={<UiIcon name="arrowRight"/>}
            sx={{
              flexShrink: 0,
              alignSelf: {xs: 'flex-start', sm: 'center'},
              minHeight: 38,
              color: 'common.white',
              border: '1px solid rgba(255,255,255,.28)',
              bgcolor: 'rgba(255,255,255,.06)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,.14)',
                borderColor: 'rgba(255,255,255,.5)'
              }
            }}
          >
            {t('common.viewAll')}
          </Button>
        </Stack>

        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: {xs: 20, sm: 28},
            bottom: -28,
            zIndex: 2,
            display: 'grid',
            width: 58,
            height: 58,
            placeItems: 'center',
            borderRadius: '50%',
            bgcolor: '#f5efe4',
            color: '#17382b',
            border: '3px solid',
            borderColor: 'common.white',
            boxShadow: '0 5px 15px rgba(16, 41, 31, .2)'
          }}
        >
          <UiIcon name={icon} sx={{fontSize: 29}}/>
        </Box>
      </Box>

      <Box
        sx={{
          px: {xs: 1.5, sm: 2.5, md: 3},
          pt: {xs: 5.25, sm: 5},
          pb: {xs: 2, sm: 2.75, md: 3},
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfa 100%)'
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}
