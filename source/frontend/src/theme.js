import {createTheme} from '@mui/material/styles';

const border = 'rgba(31, 41, 55, 0.12)';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#151515',
      dark: '#000000',
      light: '#f0f0ee',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#f6ad32',
      dark: '#cf8100',
      light: '#fff2d5',
      contrastText: '#151515'
    },
    success: {main: '#16875b'},
    warning: {main: '#e58a00'},
    background: {default: '#f7f7f5', paper: '#ffffff'},
    text: {primary: '#181818', secondary: '#6b6b68'},
    divider: border
  },
  typography: {
    fontFamily: '"Inter", "Noto Sans", "Segoe UI", Arial, sans-serif',
    h1: {fontWeight: 800, letterSpacing: '-0.035em'},
    h2: {fontWeight: 800, letterSpacing: '-0.03em'},
    h3: {fontWeight: 800, letterSpacing: '-0.025em'},
    h4: {fontWeight: 800, letterSpacing: '-0.02em'},
    h5: {fontWeight: 800, letterSpacing: '-0.015em'},
    h6: {fontWeight: 750},
    button: {fontWeight: 750, letterSpacing: 0}
  },
  shape: {borderRadius: 12},
  shadows: [
    'none',
    '0 1px 3px rgba(31,41,55,.08)',
    '0 4px 12px rgba(31,41,55,.08)',
    '0 8px 24px rgba(31,41,55,.1)',
    '0 12px 32px rgba(31,41,55,.12)',
    ...Array(20).fill('0 16px 42px rgba(31,41,55,.14)')
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {scrollBehavior: 'smooth'},
        body: {minWidth: 320, backgroundColor: '#f7f7f5'},
        '::selection': {background: '#f6ad32', color: '#111111'},
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            scrollBehavior: 'auto !important',
            transitionDuration: '0.01ms !important'
          }
        }
      }
    },
    MuiButton: {
      defaultProps: {disableElevation: true},
      styleOverrides: {
        root: {minHeight: 40, borderRadius: 10, textTransform: 'none', paddingInline: 16},
        sizeLarge: {minHeight: 48, paddingInline: 22}
      }
    },
    MuiCard: {
      styleOverrides: {root: {backgroundImage: 'none', borderColor: border, boxShadow: 'none'}}
    },
    MuiPaper: {
      styleOverrides: {root: {backgroundImage: 'none', borderColor: border}}
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          '&:hover .MuiOutlinedInput-notchedOutline': {borderColor: '#a6adb7'},
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {borderWidth: 1.5}
        }
      }
    },
    MuiChip: {styleOverrides: {root: {fontWeight: 700, borderRadius: 8}}},
    MuiTableHead: {styleOverrides: {root: {backgroundColor: '#f4f6f8'}}},
    MuiTableCell: {
      styleOverrides: {
        head: {fontWeight: 800, color: '#4b5563'},
        root: {borderColor: 'rgba(31, 41, 55, 0.09)'}
      }
    },
    MuiAlert: {styleOverrides: {root: {borderRadius: 10}}},
    MuiPaginationItem: {styleOverrides: {root: {borderRadius: 8, fontWeight: 700}}}
  }
});
