import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { createShareLink, revokeShareLink } from '../api/endpoints'

export default function ShareDialog({ open, onClose, endpointId, shareToken, onChange }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const shareUrl = shareToken ? `${window.location.origin}/shared/${shareToken}` : ''

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await onChange()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share this endpoint</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            {shareToken
              ? 'Anyone with this link can view this endpoint and every request it has recorded. They cannot edit or delete anything.'
              : 'Create a link that lets anyone view this endpoint and every request it has recorded, without signing in.'}
          </DialogContentText>

          <Alert severity="warning">
            Recorded requests include full headers and bodies, which often carry API keys and
            signing secrets from whoever calls your endpoint. Only share with people you trust.
          </Alert>

          {shareToken && (
            <TextField
              fullWidth
              size="small"
              label="Share link"
              value={shareUrl}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                        <IconButton onClick={handleCopy}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {shareToken ? (
          <Button
            color="error"
            disabled={busy}
            onClick={() => run(() => revokeShareLink(endpointId))}
          >
            Stop sharing
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => run(() => createShareLink(endpointId))}
          >
            Create link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
