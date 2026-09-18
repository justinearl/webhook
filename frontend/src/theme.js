import { createTheme } from '@mui/material/styles'

// Syntax colours for the JSON viewer live in the palette so they flip with the
// mode; CodeBlock reads them as CSS variables via `sx={{ color: 'code.key' }}`.
const lightCode = {
  key: '#1971c2',
  string: '#2b8a3e',
  number: '#e8590c',
  boolean: '#9c36b5',
  null: '#868e96',
}

const darkCode = {
  key: '#74c0fc',
  string: '#8ce99a',
  number: '#ffa94d',
  boolean: '#da77f2',
  null: '#adb5bd',
}

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#635bff' },
        background: { default: '#f5f6fa', paper: '#ffffff' },
        code: lightCode,
      },
    },
    dark: {
      palette: {
        primary: { main: '#8b85ff' },
        background: { default: '#0f1117', paper: '#171a23' },
        divider: 'rgba(255, 255, 255, 0.1)',
        code: darkCode,
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Roboto, system-ui, sans-serif',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
  },
})

export default theme
