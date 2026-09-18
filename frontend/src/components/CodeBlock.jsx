import { useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { MONO } from '../theme'

// Hand-rolled rather than pulling in a syntax-highlighting library: request
// bodies here are JSON, form-encoded or plain text, and this is the whole of
// what JSON needs.
const JSON_TOKEN = /("(?:\\.|[^"\\])*"\s*:?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

// Palette keys under `code` in theme.js, so they follow the light/dark mode.
function colorFor(token) {
  if (token.startsWith('"')) return token.trimEnd().endsWith(':') ? 'code.key' : 'code.string'
  if (token === 'true' || token === 'false') return 'code.boolean'
  if (token === 'null') return 'code.null'
  return 'code.number'
}

function highlightJson(text) {
  const nodes = []
  let lastIndex = 0
  let match

  JSON_TOKEN.lastIndex = 0
  while ((match = JSON_TOKEN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    nodes.push(
      <Box component="span" key={match.index} sx={{ color: colorFor(match[0]) }}>
        {match[0]}
      </Box>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export default function CodeBlock({ text, language, maxHeight = 420 }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
        >
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Box
        component="pre"
        sx={{
          bgcolor: 'background.default',
          border: 1,
          borderColor: 'divider',
          p: 2,
          pr: 6,
          borderRadius: 2,
          overflow: 'auto',
          maxHeight,
          fontSize: 13,
          fontFamily: MONO,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          m: 0,
        }}
      >
        {language === 'json' ? highlightJson(text) : text}
      </Box>
    </Box>
  )
}
