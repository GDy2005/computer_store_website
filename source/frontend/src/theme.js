import {createTheme} from '@mui/material/styles';

export const theme = createTheme({
  palette:{
    mode:'light',
    primary:{main:'#124c3d',dark:'#082e26',light:'#dcebe5'},
    secondary:{main:'#eea633',dark:'#bd7417',light:'#fff0d2'},
    background:{default:'#f6f5f0',paper:'#ffffff'},
    text:{primary:'#15211e',secondary:'#65716d'},
    divider:'rgba(21,33,30,0.12)'
  },
  typography:{
    fontFamily:'"Aptos", "Inter", "Segoe UI", Arial, sans-serif',
    h1:{fontWeight:900,letterSpacing:'-0.05em'},
    h2:{fontWeight:900,letterSpacing:'-0.04em'},
    h3:{fontWeight:900,letterSpacing:'-0.04em'},
    h4:{fontWeight:850,letterSpacing:'-0.03em'},
    button:{fontWeight:800}
  },
  shape:{borderRadius:18},
  components:{
    MuiCssBaseline:{
      styleOverrides:{
        html:{scrollBehavior:'smooth'},
        body:{
          minWidth:320,
          backgroundImage:'radial-gradient(circle at 10% 0%, rgba(238,166,51,0.09), transparent 30%), radial-gradient(circle at 92% 14%, rgba(18,76,61,0.08), transparent 26%)',
          backgroundAttachment:'fixed'
        },
        '::selection':{background:'#eea633',color:'#082e26'},
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
      styleOverrides:{
        root:{borderRadius:999,fontWeight:800,textTransform:'none',paddingInline:18},
        sizeLarge:{minHeight:48,paddingInline:24}
      }
    },
    MuiCard:{styleOverrides:{root:{backgroundImage:'none',borderColor:'rgba(21,33,30,0.1)'}}},
    MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}},
    MuiTextField:{defaultProps:{variant:'outlined'}},
    MuiOutlinedInput:{styleOverrides:{root:{borderRadius:14,backgroundColor:'rgba(255,255,255,0.72)'}}},
    MuiChip:{styleOverrides:{root:{fontWeight:750}}}
  }
});
