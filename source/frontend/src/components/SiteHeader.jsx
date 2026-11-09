import {useEffect, useRef, useState} from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  Collapse,
  Container,
  Divider,
  Drawer,
  Fade,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import {Link, useLocation, useNavigate} from 'react-router-dom';

import {DEFAULT_AVATAR_URL, getApiMessage, useAuth} from '../features/auth/AuthContext.jsx';
import {useCart} from '../features/cart/CartContext.jsx';
import {useLanguage} from '../features/i18n/LanguageContext.jsx';
import {fetchCategories} from '../features/products/catalogApi.js';
import UiIcon from './UiIcon.jsx';

function initials(user) {
  const source = user?.fullName || user?.displayName || user?.email || 'G';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function categoryIconName(slug = '') {
  if (slug === 'pc') return 'desktop';
  if (slug.includes('laptop')) return 'laptop';
  if (slug.includes('man-hinh')) return 'monitor';
  if (slug.includes('ban-phim')) return 'keyboard';
  if (slug.includes('chuot')) return 'mouse';
  if (slug.includes('ssd') || slug.includes('luu-tru')) return 'storage';
  return 'package';
}

function StoreLogo({compact = false}) {
  return (
    <Stack
      component={Link}
      to="/"
      direction="row"
      alignItems="center"
      spacing={1.15}
      sx={{color: 'inherit', textDecoration: 'none', flexShrink: 0}}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: 'grid',
          width: compact ? 38 : 44,
          height: compact ? 38 : 44,
          placeItems: 'center',
          bgcolor: '#151515',
          color: 'secondary.main',
          fontWeight: 950,
          letterSpacing: -1,
          clipPath: 'polygon(0 0, 82% 0, 100% 18%, 100% 100%, 18% 100%, 0 82%)'
        }}
      >
        CS
      </Box>
      {!compact && (
        <Box>
          <Typography sx={{fontWeight: 950, letterSpacing: 1.3, lineHeight: 1, fontSize: {xs: 14, sm: 17}}}>COMPUTER</Typography>
          <Typography variant="caption" color="secondary.dark" fontWeight={900} letterSpacing={4}>STORE</Typography>
        </Box>
      )}
    </Stack>
  );
}

function LanguageSwitch({withLabel = false}) {
  const {locale, setLocale, t} = useLanguage();

  return (
    <Stack direction="row" alignItems="center" spacing={withLabel ? 1 : 0.35}>
      {withLabel && (
        <Stack direction="row" spacing={0.65} alignItems="center" sx={{mr: 'auto'}}>
          <UiIcon name="globe" sx={{fontSize: 18, color: 'text.secondary'}}/>
          <Typography variant="body2" fontWeight={750}>{t('nav.language')}</Typography>
        </Stack>
      )}
      <Box role="group" aria-label={t('nav.language')} sx={{display: 'flex', alignItems: 'center', p: 0.3, border: '1px solid', borderColor: 'divider', borderRadius: 99, bgcolor: 'background.paper'}}>
        {['vi', 'en'].map(value => (
          <Button
            key={value}
            size="small"
            aria-pressed={locale === value}
            onClick={() => setLocale(value)}
            sx={{
              minWidth: 36,
              minHeight: 29,
              borderRadius: 99,
              px: 0.8,
              py: 0,
              color: locale === value ? '#151515' : 'text.secondary',
              bgcolor: locale === value ? 'secondary.main' : 'transparent',
              '&:hover': {bgcolor: locale === value ? 'secondary.dark' : 'action.hover'}
            }}
          >
            {value.toUpperCase()}
          </Button>
        ))}
      </Box>
    </Stack>
  );
}

function SearchBox({value, onChange, onSubmit, t}) {
  return (
    <Box
      component="form"
      role="search"
      onSubmit={onSubmit}
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: 760,
        height: 48,
        mx: 'auto',
        borderBottom: '2px solid #151515',
        bgcolor: 'common.white'
      }}
    >
      <UiIcon name="search" sx={{ml: 1, color: 'text.secondary'}}/>
      <InputBase
        autoFocus
        value={value}
        onChange={onChange}
        placeholder={t('nav.searchPlaceholder')}
        inputProps={{'aria-label': t('nav.searchLabel'), maxLength: 100}}
        sx={{flex: 1, minWidth: 0, px: 1.5, fontSize: 15}}
      />
      <Button type="submit" variant="contained" sx={{borderRadius: 0, height: 40, my: 0.5}}>
        {t('nav.searchAction')}
      </Button>
    </Box>
  );
}

export default function SiteHeader() {
  const {pathname, search} = useLocation();
  const navigate = useNavigate();
  const {user, loading, logout, uploadAvatar} = useAuth();
  const {cart, openCart} = useCart();
  const {t} = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [categoryAnchor, setCategoryAnchor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [topBarsHidden, setTopBarsHidden] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const scrollFrame = useRef(null);

  useEffect(() => {
    const update = () => {
      if (scrollFrame.current) return;
      scrollFrame.current = window.requestAnimationFrame(() => {
        const offset = window.scrollY;
        setScrolled(offset > 12);
        setTopBarsHidden(current => current ? offset > 24 : offset > 92);
        scrollFrame.current = null;
      });
    };
    update();
    window.addEventListener('scroll', update, {passive: true});
    return () => {
      window.removeEventListener('scroll', update);
      if (scrollFrame.current) window.cancelAnimationFrame(scrollFrame.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories({signal: controller.signal})
      .then(setCategories)
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setCategories([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setSearchValue(pathname === '/products' ? new URLSearchParams(search).get('search') || '' : '');
  }, [pathname, search]);

  const selectedCategory = pathname === '/products'
    ? new URLSearchParams(search).get('category') || ''
    : '';
  const navigation = [
    {label: t('nav.home'), to: '/'},
    {label: t('nav.categories'), categoryMenu: true},
    {label: t('nav.products'), to: '/products'}
  ];
  const accountNavigation = user
    ? [
        ...(user.role === 'ADMIN' ? [{label: t('nav.admin'), to: '/admin', icon: 'dashboard'}] : []),
        {label: t('nav.profile'), to: '/profile', icon: 'user'},
        {label: t('profile.addresses'), to: '/profile/addresses', icon: 'location'},
        {label: t('nav.orders'), to: '/orders', icon: 'receipt'},
        {label: t('profile.loyalty'), to: '/loyalty', icon: 'coupon'}
      ]
    : [{label: t('nav.login'), to: '/login', icon: 'user'}];

  function active(to) {
    if (to === '/') return pathname === '/';
    if (to === '/products' && selectedCategory) return false;
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  function submitSearch(event) {
    event.preventDefault();
    const value = searchValue.trim();
    navigate(value ? `/products?search=${encodeURIComponent(value)}` : '/products');
    setSearchOpen(false);
    setMobileOpen(false);
  }

  async function signOut() {
    try {
      await logout();
      setAccountAnchor(null);
      setMobileOpen(false);
      navigate('/');
    } catch {
      navigate('/login');
    }
  }

  async function changeAvatar(event) {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setAvatarError('');
      setAvatarMessage('');
      await uploadAvatar(file);
      setAvatarMessage(t('profile.avatarUpdated'));
    } catch (error) {
      setAvatarError(getApiMessage(error, t('profile.avatarError')));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const navButtonSx = selected => ({
    minHeight: 70,
    px: 1.3,
    borderRadius: 0,
    color: 'text.primary',
    fontSize: 12,
    fontWeight: 850,
    letterSpacing: 0.8,
    borderBottom: '3px solid',
    borderColor: selected ? 'secondary.main' : 'transparent',
    '&:hover': {bgcolor: 'transparent', borderColor: 'secondary.main'}
  });

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        color: 'text.primary',
        bgcolor: scrolled ? 'rgba(255,255,255,.78)' : 'rgba(255,255,255,.98)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(18px) saturate(145%)',
        boxShadow: scrolled ? '0 8px 24px rgba(0,0,0,.08)' : 'none',
        transition: 'background-color 220ms ease, box-shadow 220ms ease'
      }}
    >
      <Box
        sx={{
          height: topBarsHidden ? 0 : 71,
          overflow: 'hidden',
          opacity: topBarsHidden ? 0 : 1,
          transform: topBarsHidden ? 'translateY(-12px)' : 'translateY(0)',
          transition: 'height 240ms ease, opacity 180ms ease, transform 240ms ease'
        }}
      >
      <Box
        sx={{
          display: 'grid',
          height: 31,
          overflow: 'hidden',
          placeItems: 'center',
          bgcolor: scrolled ? 'rgba(0,0,0,.88)' : '#000',
          color: 'common.white',
          transition: 'background-color 220ms ease'
        }}
      >
        <Typography variant="caption" fontWeight={850} letterSpacing={0.5}>ANNOUNCEMENT</Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          height: 40,
          overflow: 'hidden',
          placeItems: 'center',
          bgcolor: scrolled ? 'rgba(36,36,36,.9)' : '#242424',
          color: 'common.white',
          transition: 'background-color 220ms ease'
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center" px={2}>
          <Typography variant="caption" textAlign="center">{t('nav.announcement')}</Typography>
          <Typography component={Link} to="/products" variant="caption" fontWeight={850} sx={{display: {xs: 'none', sm: 'block'}, color: 'secondary.main'}}>
            {t('home.shopNow')} →
          </Typography>
        </Stack>
      </Box>
      </Box>

      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{minHeight: {xs: 66, md: 88}}}>
          <Stack component="nav" direction="row" aria-label="Main navigation" sx={{display: {xs: 'none', md: 'flex'}, flex: 1, minWidth: 0}}>
            {navigation.map(item => item.categoryMenu ? (
              <Button
                key="categories"
                onClick={event => setCategoryAnchor(event.currentTarget)}
                aria-haspopup="true"
                aria-expanded={Boolean(categoryAnchor)}
                endIcon={<UiIcon name="chevronDown" sx={{fontSize: 17}}/>}
                sx={navButtonSx(Boolean(selectedCategory) || Boolean(categoryAnchor))}
              >
                {item.label}
              </Button>
            ) : (
              <Button key={item.to} component={Link} to={item.to} sx={navButtonSx(active(item.to))}>{item.label}</Button>
            ))}
          </Stack>

          <Box sx={{display: {xs: 'none', md: 'block'}}}><StoreLogo/></Box>
          <Box sx={{display: {xs: 'block', md: 'none'}}}><StoreLogo compact/></Box>

          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.35} sx={{flex: 1}}>
            <Tooltip title={t('nav.searchAction')}>
              <IconButton onClick={() => setSearchOpen(value => !value)} aria-expanded={searchOpen} aria-label={t('nav.searchAction')}>
                <UiIcon name={searchOpen ? 'close' : 'search'}/>
              </IconButton>
            </Tooltip>
            <Box sx={{display: {xs: 'none', xl: 'block'}}}><LanguageSwitch/></Box>
            {!loading && user?.role === 'ADMIN' && (
              <Tooltip title={t('nav.admin')}>
                <IconButton component={Link} to="/admin" color={pathname.startsWith('/admin') ? 'secondary' : 'default'}>
                  <UiIcon name="dashboard"/>
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t('nav.cart')}>
              <IconButton onClick={openCart} aria-label={t('nav.cart')}>
                <Badge badgeContent={cart.totalItems} color="secondary" max={99}>
                  <UiIcon name="cart"/>
                </Badge>
              </IconButton>
            </Tooltip>
            {loading ? (
              <CircularProgress size={26}/>
            ) : (
              <Tooltip title={user?.fullName || user?.email || t('nav.guest')}>
                <IconButton
                  onClick={event => setAccountAnchor(current => current ? null : event.currentTarget)}
                  aria-haspopup="true"
                  aria-expanded={Boolean(accountAnchor)}
                  sx={{p: 0.4}}
                >
                  <Avatar
                    src={user ? (user.avatarUrl || DEFAULT_AVATAR_URL) : undefined}
                    alt={user?.fullName || user?.email || t('nav.guest')}
                    sx={{width: 38, height: 38, bgcolor: user ? 'secondary.main' : '#151515', color: user ? '#151515' : 'common.white', fontSize: 14, fontWeight: 900}}
                  >
                    {user ? initials(user) : <UiIcon name="user" sx={{fontSize: 21}}/>}
                  </Avatar>
                </IconButton>
              </Tooltip>
            )}
            <IconButton sx={{display: {md: 'none'}}} onClick={() => setMobileOpen(true)} aria-label={t('nav.openMenu')}>
              <UiIcon name="menu"/>
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      <Collapse in={searchOpen} timeout={220}>
        <Box sx={{borderTop: '1px solid', borderColor: 'divider', bgcolor: 'common.white', py: 1.5, px: 2}}>
          <SearchBox value={searchValue} onChange={event => setSearchValue(event.target.value)} onSubmit={submitSearch} t={t}/>
        </Box>
      </Collapse>

      <Menu
        anchorEl={categoryAnchor}
        open={Boolean(categoryAnchor)}
        onClose={() => setCategoryAnchor(null)}
        disableScrollLock
        anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
        transformOrigin={{vertical: 'top', horizontal: 'left'}}
        slotProps={{paper: {sx: {mt: 0.5, minWidth: 260, p: 0.8, border: '1px solid', borderColor: 'divider', boxShadow: '0 18px 48px rgba(0,0,0,.15)'}}}}
      >
        <MenuItem component={Link} to="/products" onClick={() => setCategoryAnchor(null)} sx={{borderRadius: 1.5, fontWeight: 850, gap: 1.2}}>
          <UiIcon name="grid" sx={{fontSize: 20}}/>
          {t('products.allCategories')}
        </MenuItem>
        <Divider sx={{my: 0.6}}/>
        {categories.map(category => (
          <MenuItem
            key={category._id || category.slug}
            component={Link}
            to={`/products?category=${category.slug}`}
            selected={selectedCategory === category.slug}
            onClick={() => setCategoryAnchor(null)}
            sx={{borderRadius: 1.5, gap: 1.2, py: 1}}
          >
            <Box sx={{display: 'grid', width: 30, height: 30, placeItems: 'center', borderRadius: '50%', bgcolor: 'secondary.light'}}>
              <UiIcon name={categoryIconName(category.slug)} sx={{fontSize: 18}}/>
            </Box>
            {category.name}
          </MenuItem>
        ))}
      </Menu>

      <Popper open={Boolean(accountAnchor)} anchorEl={accountAnchor} placement="bottom-end" transition sx={{zIndex: theme => theme.zIndex.appBar + 2}}>
        {({TransitionProps}) => (
          <Fade {...TransitionProps} timeout={180}>
            <Box sx={{pt: 1}}>
              <ClickAwayListener onClickAway={() => setAccountAnchor(null)}>
                <Paper variant="outlined" sx={{width: 320, overflow: 'hidden', borderRadius: 1.5, boxShadow: '0 24px 64px rgba(0,0,0,.2)'}}>
                  {user ? (
                    <Box sx={{position: 'relative', pb: 1.5}}>
                      <Box sx={{height: 88, background: 'linear-gradient(135deg,#171717 0%,#173e34 62%,#e8a326 160%)', position: 'relative', overflow: 'hidden', '&::after': {content: '""', position: 'absolute', width: 130, height: 130, border: '1px solid rgba(255,255,255,.13)', borderRadius: '50%', right: -30, top: -55}}}/>
                      <Box sx={{position: 'absolute', top: 48, left: 18}}>
                        <Avatar
                          src={user.avatarUrl || DEFAULT_AVATAR_URL}
                          alt={user.fullName || user.email}
                          sx={{width: 76, height: 76, bgcolor: 'secondary.main', color: '#151515', fontWeight: 900, border: '4px solid white', boxShadow: '0 8px 22px rgba(0,0,0,.18)'}}
                        >
                          {initials(user)}
                        </Avatar>
                        <IconButton
                          component="label"
                          disabled={uploadingAvatar}
                          aria-label={t('profile.changeAvatar')}
                          sx={{position: 'absolute', right: -4, bottom: -2, width: 30, height: 30, bgcolor: 'secondary.main', color: '#151515', border: '2px solid white', '&:hover': {bgcolor: 'secondary.dark'}}}
                        >
                          {uploadingAvatar ? <CircularProgress size={15} color="inherit"/> : <UiIcon name="camera" sx={{fontSize: 16}}/>}
                          <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={changeAvatar}/>
                        </IconButton>
                      </Box>
                      <Box sx={{pt: 5.5, px: 2.25}}>
                        <Typography fontWeight={900} fontSize={17} noWrap>{user.fullName || user.email}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
                        <Typography variant="caption" sx={{display: 'inline-block', mt: 0.8, px: 1, py: 0.25, bgcolor: 'action.hover', fontWeight: 800}}>
                          {user.role === 'ADMIN' ? t('nav.admin') : t('profile.customer')}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={1.35} alignItems="center" sx={{p: 2, bgcolor: '#171717', color: 'common.white'}}>
                      <Avatar sx={{width: 50, height: 50, bgcolor: 'secondary.main', color: '#151515'}}><UiIcon name="user"/></Avatar>
                      <Box><Typography fontWeight={850}>{t('nav.guest')}</Typography><Typography variant="caption" sx={{color: 'rgba(255,255,255,.62)'}}>{t('nav.login')}</Typography></Box>
                    </Stack>
                  )}
                  {avatarError && <Alert severity="error" sx={{mx: 1.5, mb: 1}}>{avatarError}</Alert>}
                  {avatarMessage && <Alert severity="success" sx={{mx: 1.5, mb: 1}}>{avatarMessage}</Alert>}
                  <Stack sx={{p: 1}}>
                    {accountNavigation.map(item => (
                      <Button
                        key={item.to}
                        component={Link}
                        to={item.to}
                        onClick={() => setAccountAnchor(null)}
                        color="inherit"
                        startIcon={<UiIcon name={item.icon} sx={{fontSize: 19}}/>}
                        sx={{justifyContent: 'flex-start', minHeight: 42}}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Stack>
                  <Divider/>
                  <Box sx={{p: 1.4}}><LanguageSwitch withLabel/></Box>
                  {user && (
                    <>
                      <Divider/>
                      <Button onClick={signOut} color="error" fullWidth sx={{justifyContent: 'flex-start', borderRadius: 0, px: 2, py: 1.25}}>
                        {t('nav.logout')}
                      </Button>
                    </>
                  )}
                </Paper>
              </ClickAwayListener>
            </Box>
          </Fade>
        )}
      </Popper>

      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{width: {xs: 300, sm: 360}}} role="presentation">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{p: 2}}>
            <StoreLogo/>
            <IconButton onClick={() => setMobileOpen(false)} aria-label="Close"><UiIcon name="close"/></IconButton>
          </Stack>
          {user && (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{mx: 1.5, mb: 1, p: 1.5, bgcolor: '#171717', color: 'common.white', borderRadius: 2}}>
              <Avatar src={user.avatarUrl || DEFAULT_AVATAR_URL} sx={{bgcolor: 'secondary.main', color: '#151515', fontWeight: 900}}>{initials(user)}</Avatar>
              <Box sx={{minWidth: 0}}>
                <Typography fontWeight={800} noWrap>{user.fullName || user.email}</Typography>
                <Typography variant="caption" sx={{color: 'rgba(255,255,255,.62)'}} noWrap>{user.email}</Typography>
              </Box>
            </Stack>
          )}
          <Divider/>
          <List sx={{p: 1.25}}>
            <ListItemButton component={Link} to="/" onClick={() => setMobileOpen(false)} selected={pathname === '/'}>
              <ListItemText primary={t('nav.home')} primaryTypographyProps={{fontWeight: 750}}/>
            </ListItemButton>
            <ListItemButton component={Link} to="/products" onClick={() => setMobileOpen(false)} selected={pathname === '/products' && !selectedCategory}>
              <ListItemText primary={t('nav.products')} primaryTypographyProps={{fontWeight: 750}}/>
            </ListItemButton>
            <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{display: 'block', px: 2, pt: 2, pb: 0.5}}>{t('nav.categories')}</Typography>
            {categories.map(category => (
              <ListItemButton key={category._id || category.slug} component={Link} to={`/products?category=${category.slug}`} onClick={() => setMobileOpen(false)} sx={{pl: 2.5}}>
                <UiIcon name={categoryIconName(category.slug)} sx={{fontSize: 19, mr: 1.25}}/>
                <ListItemText primary={category.name}/>
              </ListItemButton>
            ))}
            <Divider sx={{my: 1}}/>
            {accountNavigation.map(item => (
              <ListItemButton key={item.to} component={Link} to={item.to} onClick={() => setMobileOpen(false)}>
                <UiIcon name={item.icon} sx={{fontSize: 19, mr: 1.25}}/>
                <ListItemText primary={item.label} primaryTypographyProps={{fontWeight: 750}}/>
              </ListItemButton>
            ))}
            {user && (
              <ListItemButton onClick={signOut} sx={{color: 'error.main'}}>
                <ListItemText primary={t('nav.logout')} primaryTypographyProps={{fontWeight: 750}}/>
              </ListItemButton>
            )}
          </List>
          <Divider/>
          <Box sx={{p: 2}}><LanguageSwitch withLabel/></Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
