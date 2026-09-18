import { IconButton, Tooltip } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'

/** Flips between light and dark. Defaults to the system preference until the
 *  user picks one; MUI persists the choice in localStorage. */
export default function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()
  // `mode` is undefined on the very first render, before MUI has read storage.
  if (!mode) return null

  const resolved = mode === 'system' ? systemMode : mode
  const isDark = resolved === 'dark'

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton onClick={() => setMode(isDark ? 'light' : 'dark')} aria-label="Toggle colour mode">
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
