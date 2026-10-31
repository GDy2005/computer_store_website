import React from 'react';
import {CssBaseline, ThemeProvider} from '@mui/material';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';

import App from './App.jsx';
import {AuthProvider} from './features/auth/AuthContext.jsx';
import {CartProvider} from './features/cart/CartContext.jsx';
import {LanguageProvider} from './features/i18n/LanguageContext.jsx';
import {theme} from './theme.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline/>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <App/>
            </CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
