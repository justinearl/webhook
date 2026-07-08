import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#635bff' },
    background: { default: '#f5f6fa' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, system-ui, sans-serif',
  },
})

export default theme
