import { useState } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

// Hand-rolled rather than pulling in a syntax-highlighting library: request
// bodies here are JSON, form-encoded or plain text, and this is the whole of
// what JSON needs.
const JSON_TOKEN = /("(?:\\.|[^"\\])*"\s*:?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

const COLORS = {
  key: '#1971c2',
  string: '#2b8a3e',
  number: '#e8590c',
  boolean: '#9c36b5',
  null: '#868e96',
}

function colorFor(token) {
  if (token.startsWith('"')) return token.trimEnd().endsWith(':') ? COLORS.key : COLORS.string
  if (token === 'true' || token === 'false') return COLORS.boolean
  if (token === 'null') return COLORS.null
  return COLORS.number
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
          bgcolor: 'action.hover',
          p: 2,
          pr: 6,
          borderRadius: 1,
          overflow: 'auto',
          maxHeight,
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
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
