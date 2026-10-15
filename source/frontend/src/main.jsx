import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {ThemeProvider,CssBaseline} from '@mui/material';
import {theme} from './theme.js';
import App from './App.jsx';
import {AuthProvider} from './features/auth/AuthContext.jsx';
createRoot(document.getElementById('root')).render(<React.StrictMode><ThemeProvider theme={theme}><CssBaseline/><BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter></ThemeProvider></React.StrictMode>);
