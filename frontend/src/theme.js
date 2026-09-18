import { alpha, createTheme } from '@mui/material/styles'

// Syntax colours for the JSON viewer live in the palette so they flip with the
// mode; CodeBlock reads them as CSS variables via `sx={{ color: 'code.key' }}`.
const lightCode = {
  key: '#1c5fb8',
  string: '#22863a',
  number: '#d9480f',
  boolean: '#8a3ffc',
  null: '#868e96',
}

const darkCode = {
  key: '#79b8ff',
  string: '#85e89d',
  number: '#ffab70',
  boolean: '#c792ea',
  null: '#9aa4b2',
}

const FONT = '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif'
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#5b5bd6' },
        background: { default: '#f7f7f9', paper: '#ffffff' },
        text: { primary: '#16171d', secondary: '#6b6f7b' },
        divider: '#e6e7eb',
        code: lightCode,
      },
    },
    dark: {
      palette: {
        primary: { main: '#8f8ff0' },
        background: { default: '#0f1014', paper: '#17181d' },
        text: { primary: '#ececf1', secondary: '#9a9ead' },
        divider: '#26272e',
        code: darkCode,
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: FONT,
    h5: { fontWeight: 600, letterSpacing: '-0.015em', fontSize: '1.375rem' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em', fontSize: '1.0625rem' },
    subtitle1: { fontWeight: 600, fontSize: '0.9375rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },
    body2: { fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFeatureSettings: '"cv11", "ss01"' },
      },
    },
    MuiAppBar: {
      defaultProps: { color: 'inherit', elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.paper,
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: '56px !important' } },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.default,
          borderRight: `1px solid ${theme.vars.palette.divider}`,
          backgroundImage: 'none',
        }),
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 14 },
        sizeSmall: { paddingInline: 10, fontSize: '0.8125rem' },
        outlined: ({ theme }) => ({
          borderColor: theme.vars.palette.divider,
          color: theme.vars.palette.text.primary,
          '&:hover': {
            borderColor: theme.vars.palette.text.secondary,
            backgroundColor: theme.vars.palette.action.hover,
          },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 6 },
        sizeSmall: { height: 22, fontSize: '0.75rem' },
        outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          backgroundColor: theme.vars.palette.background.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.vars.palette.text.secondary,
          },
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: theme.vars.palette.text.secondary,
            backgroundColor: theme.vars.palette.background.paper,
            borderBottomColor: theme.vars.palette.divider,
            paddingTop: 10,
            paddingBottom: 10,
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({ borderBottomColor: theme.vars.palette.divider }),
        sizeSmall: { paddingTop: 9, paddingBottom: 9 },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:last-child td': { borderBottom: 0 } },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          marginInline: 8,
          paddingBlock: 8,
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.14) },
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 14,
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: '1.0625rem', fontWeight: 600 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, paddingBlock: 3, paddingInline: 10 },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: '0.75rem', borderRadius: 6 } },
    },
  },
})

export default theme
