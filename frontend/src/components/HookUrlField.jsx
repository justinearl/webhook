import { useState } from 'react'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { MONO } from '../theme'

/** The endpoint's URL as a monospace bar with a copy button. */
export default function HookUrlField({ url, label = 'Endpoint URL' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: 1.5,
          pr: 0.5,
          py: 0.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Typography
          component="code"
          sx={{
            fontFamily: MONO,
            fontSize: 13.5,
            flexGrow: 1,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            py: 0.75,
            userSelect: 'all',
          }}
        >
          {url}
        </Typography>
        <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
          <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
