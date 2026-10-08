import {createTheme} from '@mui/material/styles';

export const theme = createTheme({
  palette:{
    mode:'light',
    primary:{main:'#173f35'},
    secondary:{main:'#d79537'},
    background:{default:'#f4f5f1',paper:'#ffffff'}
  },
  typography:{
    fontFamily:'Inter, Arial, sans-serif',
    h3:{fontWeight:700}
  },
  shape:{borderRadius:12},
  components:{
    MuiButton:{defaultProps:{disableElevation:true}},
    MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}}
  }
});
