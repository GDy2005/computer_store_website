import {createTheme} from '@mui/material/styles';

export const theme = createTheme({
  palette:{
    mode:'light',
    primary:{main:'#173f35'},
    secondary:{main:'#d79537'},
    background:{default:'#f4f5f1',paper:'#ffffff'}
  },
  typography:{
    fontFamily:'Inter, "Segoe UI", Arial, sans-serif',
    h3:{fontWeight:800,letterSpacing:'-0.035em'},
    h4:{letterSpacing:'-0.025em'}
  },
  shape:{borderRadius:14},
  components:{
    MuiCssBaseline:{
      styleOverrides:{
        body:{minWidth:320},
        '@media (prefers-reduced-motion: reduce)':{
          '*, *::before, *::after':{
            animationDuration:'0.01ms !important',
            animationIterationCount:'1 !important',
            scrollBehavior:'auto !important',
            transitionDuration:'0.01ms !important'
          }
        }
      }
    },
    MuiButton:{
      defaultProps:{disableElevation:true},
      styleOverrides:{root:{borderRadius:10,fontWeight:750,textTransform:'none'}}
    },
    MuiCard:{styleOverrides:{root:{backgroundImage:'none'}}},
    MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}}
  }
});
