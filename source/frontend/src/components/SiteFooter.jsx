import {Box, Button, Container, Divider, Stack, Typography} from '@mui/material';
import {Link} from 'react-router-dom';

import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import UiIcon from './UiIcon.jsx';

function FooterLink({to, children}) {
  return (
    <Typography
      component={Link}
      to={to}
      variant="body2"
      sx={{color:'rgba(255,255,255,.68)',textDecoration:'none','&:hover':{color:'common.white'}}}
    >
      {children}
    </Typography>
  );
}

export default function SiteFooter() {
  const {t} = useLanguage();

  return (
    <Box component="footer" sx={{mt:{xs:7,md:10},bgcolor:'primary.dark',color:'common.white',borderTop:'4px solid',borderColor:'secondary.main'}}>
      <Container maxWidth="xl" sx={{py:{xs:5,md:7}}}>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'minmax(300px,1.5fr) 1fr 1fr'},gap:{xs:4,md:7}}}>
          <Stack spacing={2.25} maxWidth={500}>
            <Stack direction="row" alignItems="center" spacing={1.2}>
              <Box sx={{display:'grid',width:42,height:42,placeItems:'center',borderRadius:'10px 10px 10px 3px',bgcolor:'secondary.main',color:'common.white',fontWeight:950}}>CS</Box>
              <Typography variant="h6" fontWeight={950} letterSpacing={1}>COMPUTER STORE</Typography>
            </Stack>
            <Typography color="rgba(255,255,255,.62)" sx={{lineHeight:1.75}}>{t('footer.tagline')}</Typography>
            <Button
              component={Link}
              to="/products"
              color="secondary"
              variant="contained"
              endIcon={<UiIcon name="arrowRight"/>}
              sx={{alignSelf:'flex-start'}}
            >
              {t('common.viewProduct')}
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            <Typography fontWeight={900} color="common.white">{t('footer.explore')}</Typography>
            <FooterLink to="/products">{t('footer.catalog')}</FooterLink>
            <FooterLink to="/products?sort=newest">{t('footer.new')}</FooterLink>
          </Stack>
          <Stack spacing={1.5}>
            <Typography fontWeight={900} color="common.white">{t('footer.account')}</Typography>
            <FooterLink to="/profile">{t('footer.profile')}</FooterLink>
            <FooterLink to="/orders">{t('footer.orders')}</FooterLink>
            <FooterLink to="/cart">{t('nav.cart')}</FooterLink>
          </Stack>
        </Box>
        <Divider sx={{my:4,borderColor:'rgba(255,255,255,.12)'}}/>
        <Stack direction={{xs:'column',sm:'row'}} spacing={1} justifyContent="space-between">
          <Typography color="rgba(255,255,255,.48)" variant="caption">© {new Date().getFullYear()} {t('footer.rights')}</Typography>
          <Typography color="rgba(255,255,255,.48)" variant="caption">{t('footer.promise')}</Typography>
        </Stack>
      </Container>
    </Box>
  );
}
