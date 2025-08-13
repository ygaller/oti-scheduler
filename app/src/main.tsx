import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import stylisRTLPlugin from 'stylis-plugin-rtl'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'

const cacheRtl = createCache({ key: 'muirtl', stylisPlugins: [stylisRTLPlugin] })

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Heebo, Rubik, Arial, sans-serif',
  },
})

document.documentElement.setAttribute('dir', 'rtl')
document.documentElement.setAttribute('lang', 'he')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </CacheProvider>
  </StrictMode>,
)
