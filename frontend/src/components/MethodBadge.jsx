import { Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { MONO } from '../theme'

const COLORS = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
}

/** Tinted pill for an HTTP method: coloured text on a translucent background,
 *  lighter on the eye than a row of solid chips. */
export default function MethodBadge({ method, size = 'small' }) {
  const key = COLORS[method]
  return (
    <Box
      component="span"
      sx={(theme) => {
        const color = key ? theme.palette[key].main : theme.palette.text.secondary
        return {
          display: 'inline-block',
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: size === 'small' ? 11 : 12,
          lineHeight: 1,
          letterSpacing: '0.02em',
          px: size === 'small' ? 0.75 : 1,
          py: size === 'small' ? 0.5 : 0.75,
          borderRadius: 1,
          color,
          bgcolor: alpha(color, 0.12),
          minWidth: 52,
          textAlign: 'center',
        }
      }}
    >
      {method}
    </Box>
  )
}
