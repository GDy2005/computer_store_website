import {useEffect, useState} from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {Link, useLocation, useNavigate} from 'react-router-dom';

import {useAuth} from '../features/auth/AuthContext.jsx';
import {useCart} from '../features/cart/CartContext.jsx';
import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import UiIcon from './UiIcon.jsx';

function LanguageSwitch({compact = false}) {
  const {locale, setLocale, t} = useLanguage();

  return (
    <Box
      role="group"
      aria-label={t('nav.language')}
      sx={{
        display:'flex',alignItems:'center',gap:0.25,p:0.35,
        border:'1px solid',borderColor:'divider',borderRadius:999,
        bgcolor:'rgba(255,255,255,0.72)'
      }}
    >
      {!compact && <UiIcon name="globe" sx={{ml:0.7,fontSize:17,color:'text.secondary'}}/>}
      {['vi','en'].map(value => (
        <Button
          key={value}
          size="small"
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          sx={{
            minWidth:34,px:0.8,py:0.25,
            color:locale === value ? 'common.white' : 'text.secondary',
            bgcolor:locale === value ? 'primary.main' : 'transparent',
            '&:hover':{bgcolor:locale === value ? 'primary.dark' : 'action.hover'}
          }}
        >
          {value.toUpperCase()}
        </Button>
      ))}
    </Box>
  );
}

export default function SiteHeader() {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const {user, loading, logout} = useAuth();
  const {cart} = useCart();
  const {t} = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 44);
    update();
    window.addEventListener('scroll', update, {passive:true});
    return () => window.removeEventListener('scroll', update);
  }, []);

  const navigation = [
    {label:t('nav.home'),to:'/'},
    {label:t('nav.products'),to:'/products'},
    {label:t('nav.system'),to:'/foundation'}
  ];

  const active = to => (
    to === '/'
      ? pathname === '/'
      : pathname === to || pathname.startsWith(`${to}/`)
  );

  const userNavigation = user
    ? [
        ...(user.role === 'ADMIN' ? [{label:t('nav.admin'),to:'/admin'}] : []),
        {label:t('nav.orders'),to:'/orders'},
        {label:t('nav.profile'),to:'/profile'}
      ]
    : [{label:t('nav.login'),to:'/login'}];

  const allNavigation = [
    ...navigation,
    {label:`${t('nav.cart')} (${cart.totalItems})`,to:'/cart'},
    ...userNavigation
  ];

  async function signOut() {
    try {
      await logout();
      setMobileOpen(false);
      setAccountAnchor(null);
      navigate('/');
    } catch {
      navigate('/login');
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        color:'text.primary',
        bgcolor:scrolled ? 'rgba(255,255,255,0.76)' : 'rgba(255,255,255,0.96)',
        opacity:scrolled ? 0.9 : 1,
        borderBottom:'1px solid',
        borderColor:scrolled ? 'rgba(21,33,30,0.1)' : 'transparent',
        backdropFilter:'blur(18px) saturate(145%)',
        transition:'opacity 240ms ease, background-color 240ms ease, box-shadow 240ms ease',
        boxShadow:scrolled ? '0 10px 34px rgba(18,45,38,0.08)' : 'none',
        '&:hover,&:focus-within':{opacity:1}
      }}
    >
      <Box
        sx={{
          display:'grid',overflow:'hidden',
          maxHeight:scrolled ? 0 : 34,minHeight:scrolled ? 0 : 34,
          placeItems:'center',bgcolor:'#0a201b',color:'rgba(255,255,255,0.86)',
          transition:'max-height 260ms ease, min-height 260ms ease, opacity 200ms ease',
          opacity:scrolled ? 0 : 1
        }}
      >
        <Typography variant="caption" fontWeight={750} letterSpacing={0.35} textAlign="center" px={2}>
          {t('nav.announcement')}
        </Typography>
      </Box>

      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{minHeight:{xs:66,md:78},gap:{xs:1,md:3}}}>
          <Stack
            component={Link}
            to="/"
            direction="row"
            alignItems="center"
            spacing={1.2}
            sx={{color:'inherit',textDecoration:'none',minWidth:{md:240},flexGrow:{xs:1,md:0}}}
          >
            <Box
              aria-hidden="true"
              sx={{
                display:'grid',width:39,height:39,placeItems:'center',
                borderRadius:'12px 12px 4px 12px',bgcolor:'primary.main',
                color:'common.white',fontWeight:950,letterSpacing:-1,
                boxShadow:'inset -8px -8px 0 rgba(0,0,0,0.1)'
              }}
            >
              CS
            </Box>
            <Box>
              <Typography fontWeight={950} letterSpacing={0.8} lineHeight={1}>COMPUTER</Typography>
              <Typography variant="caption" color="secondary.dark" fontWeight={900} letterSpacing={3.2}>STORE</Typography>
            </Box>
          </Stack>

          <Stack
            component="nav"
            direction="row"
            spacing={0.5}
            aria-label="Main navigation"
            sx={{display:{xs:'none',md:'flex'},flexGrow:1,justifyContent:'center'}}
          >
            {navigation.map(item => (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                aria-current={active(item.to) ? 'page' : undefined}
                sx={{
                  position:'relative',color:'text.primary',px:1.75,
                  '&::after':{
                    content:'""',position:'absolute',right:18,bottom:3,left:18,height:2,
                    borderRadius:2,bgcolor:'secondary.main',
                    transform:active(item.to) ? 'scaleX(1)' : 'scaleX(0)',
                    transition:'transform 180ms ease'
                  },
                  '&:hover::after':{transform:'scaleX(1)'}
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{display:{xs:'none',lg:'block'}}}><LanguageSwitch/></Box>
            <Tooltip title={t('nav.cart')}>
              <IconButton
                component={Link}
                to="/cart"
                aria-current={pathname.startsWith('/cart') || pathname.startsWith('/checkout') ? 'page' : undefined}
                sx={{color:'text.primary',bgcolor:pathname.startsWith('/cart') ? 'primary.light' : 'transparent'}}
              >
                <Badge badgeContent={cart.totalItems} color="secondary" max={99}>
                  <UiIcon name="cart"/>
                </Badge>
              </IconButton>
            </Tooltip>

            {loading && <CircularProgress size={22}/>}
            {!loading && !user && (
              <Tooltip title={t('nav.login')}>
                <IconButton component={Link} to="/login" sx={{color:'text.primary'}}>
                  <UiIcon name="user"/>
                </IconButton>
              </Tooltip>
            )}
            {!loading && user && (
              <>
                <Tooltip title={user.fullName}>
                  <IconButton
                    onClick={event => setAccountAnchor(event.currentTarget)}
                    aria-controls={accountAnchor ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={Boolean(accountAnchor)}
                    sx={{color:'common.white',bgcolor:'primary.main','&:hover':{bgcolor:'primary.dark'}}}
                  >
                    <UiIcon name="user"/>
                  </IconButton>
                </Tooltip>
                <Menu
                  id="account-menu"
                  anchorEl={accountAnchor}
                  open={Boolean(accountAnchor)}
                  onClose={() => setAccountAnchor(null)}
                  slotProps={{paper:{sx:{mt:1.2,minWidth:210,border:'1px solid',borderColor:'divider',boxShadow:'0 20px 50px rgba(8,46,38,0.14)'}}}}
                >
                  <Box sx={{px:2,py:1}}>
                    <Typography fontWeight={850}>{user.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  </Box>
                  <Divider/>
                  {userNavigation.map(item => (
                    <MenuItem key={item.to} component={Link} to={item.to} onClick={() => setAccountAnchor(null)}>
                      {item.label}
                    </MenuItem>
                  ))}
                  <Divider/>
                  <MenuItem onClick={signOut} sx={{color:'error.main'}}>{t('nav.logout')}</MenuItem>
                </Menu>
              </>
            )}

            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label={t('nav.openMenu')}
              sx={{display:{xs:'inline-flex',md:'none'},color:'text.primary'}}
            >
              <UiIcon name="menu"/>
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{width:{xs:300,sm:340},p:2.5}}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={950}>COMPUTER STORE</Typography>
              <Typography variant="body2" color="text.secondary">
                {user ? user.fullName : t('nav.guest')}
              </Typography>
            </Box>
            <IconButton onClick={() => setMobileOpen(false)} aria-label={t('chat.close')}><UiIcon name="close"/></IconButton>
          </Stack>
          <LanguageSwitch/>
        </Box>
        <Divider/>
        <List component="nav" aria-label="Mobile navigation" sx={{p:1.5}}>
          {allNavigation.map(item => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={active(item.to) || (item.to === '/cart' && pathname.startsWith('/checkout'))}
              onClick={() => setMobileOpen(false)}
              sx={{borderRadius:2.5,mb:0.5,py:1.15}}
            >
              <ListItemText primary={item.label} primaryTypographyProps={{fontWeight:active(item.to) ? 900 : 700}}/>
            </ListItemButton>
          ))}
          {user && (
            <ListItemButton onClick={signOut} sx={{borderRadius:2.5,color:'error.main'}}>
              <ListItemText primary={t('nav.logout')} primaryTypographyProps={{fontWeight:800}}/>
            </ListItemButton>
          )}
        </List>
      </Drawer>
    </AppBar>
  );
}
