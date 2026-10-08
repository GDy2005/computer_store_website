import {AppBar,Button,Container,Stack,Toolbar,Typography} from '@mui/material';
import {Link,useLocation} from 'react-router-dom';

const navigation = [
  {label:'Trang chủ',to:'/'},
  {label:'Hệ thống',to:'/foundation'}
];

export default function SiteHeader() {
  const {pathname} = useLocation();

  return (
    <AppBar position="sticky" elevation={0} sx={{borderBottom:'1px solid',borderColor:'rgba(255,255,255,0.14)'}}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{minHeight:{xs:64,md:72}}}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{flexGrow:1,color:'inherit',fontWeight:800,letterSpacing:{xs:0.4,sm:1},textDecoration:'none'}}
          >
            COMPUTER STORE
          </Typography>
          <Stack component="nav" direction="row" spacing={{xs:0,sm:1}} aria-label="Điều hướng chính">
            {navigation.map(item => (
              <Button
                key={item.to}
                color="inherit"
                component={Link}
                to={item.to}
                aria-current={pathname === item.to ? 'page' : undefined}
                sx={{fontWeight:pathname === item.to ? 700 : 500,minWidth:{xs:'auto',sm:64},px:{xs:1,sm:2}}}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
