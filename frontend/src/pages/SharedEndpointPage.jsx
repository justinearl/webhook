import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Alert, AppBar, Box, Chip, CircularProgress, Paper, Stack, Toolbar, Typography } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import WebhookIcon from '@mui/icons-material/Webhook'
import { getSharedEndpoint, getSharedRequest, listSharedRequests } from '../api/shared'
import { streamSharedRequests } from '../api/stream'
import RequestsPanel from '../components/RequestsPanel'
import ColorModeToggle from '../components/ColorModeToggle'
import HookUrlField from '../components/HookUrlField'

export default function SharedEndpointPage() {
  const { token } = useParams()
  const [endpoint, setEndpoint] = useState(null)
  const [error, setError] = useState('')

  const loadEndpoint = useCallback(async () => {
    try {
      setEndpoint(await getSharedEndpoint(token))
    } catch {
      setError('This share link is invalid or has been revoked.')
    }
  }, [token])

  useEffect(() => {
    setEndpoint(null)
    setError('')
    loadEndpoint()
  }, [loadEndpoint])

  // Stable identities: RequestsPanel reconnects its stream whenever these change.
  const fetchPage = useCallback((params) => listSharedRequests(token, params), [token])
  const fetchDetail = useCallback((requestId) => getSharedRequest(token, requestId), [token])
  const openStream = useCallback((handlers) => streamSharedRequests(token, handlers), [token])

  const hookUrl = endpoint ? `${window.location.origin}/hook/${endpoint.id}` : ''

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          <WebhookIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Webhook Catcher
          </Typography>
          <Chip size="small" variant="outlined" icon={<VisibilityIcon />} label="Read-only" />
          <ColorModeToggle />
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!error && !endpoint && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <CircularProgress />
          </Box>
        )}

        {endpoint && (
          <>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h5">{endpoint.name || 'Untitled endpoint'}</Typography>
              {endpoint.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {endpoint.description}
                </Typography>
              )}
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <HookUrlField url={hookUrl} />
              <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                <Chip size="small" variant="outlined" label={`Responds ${endpoint.response_status}`} />
                <Chip size="small" variant="outlined" label={endpoint.response_content_type} />
              </Stack>
            </Paper>

            <RequestsPanel
              requestCount={endpoint.request_count}
              hookUrl={hookUrl}
              fetchPage={fetchPage}
              fetchDetail={fetchDetail}
              openStream={openStream}
              onRequestsChanged={loadEndpoint}
              emptyMessage="No calls recorded on this endpoint yet."
            />
          </>
        )}
      </Box>
    </Box>
  )
}
