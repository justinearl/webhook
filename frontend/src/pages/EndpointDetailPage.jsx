import { useCallback, useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ShareIcon from '@mui/icons-material/Share'
import { getEndpoint, getRequest, listRequests, updateEndpoint } from '../api/endpoints'
import { streamEndpointRequests } from '../api/stream'
import EndpointFormDialog from '../components/EndpointFormDialog'
import RequestsPanel from '../components/RequestsPanel'
import ShareDialog from '../components/ShareDialog'
import ConfirmDialog from '../components/ConfirmDialog'

export default function EndpointDetailPage() {
  const { endpointId } = useParams()
  const { refresh, onDelete } = useOutletContext()
  const [endpoint, setEndpoint] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const hookUrl = `${window.location.origin}/hook/${endpointId}`

  const loadEndpoint = useCallback(async () => {
    setEndpoint(await getEndpoint(endpointId))
  }, [endpointId])

  useEffect(() => {
    // Clear stale data immediately so switching endpoints never shows the wrong one mid-fetch.
    setEndpoint(null)
    loadEndpoint()
  }, [loadEndpoint])

  // Stable identities: RequestsPanel reconnects its stream whenever these change.
  const fetchPage = useCallback((params) => listRequests(endpointId, params), [endpointId])
  const fetchDetail = useCallback((requestId) => getRequest(endpointId, requestId), [endpointId])
  const openStream = useCallback(
    (handlers) => streamEndpointRequests(endpointId, handlers),
    [endpointId],
  )
  const onRequestsChanged = useCallback(async () => {
    await Promise.all([loadEndpoint(), refresh()])
  }, [loadEndpoint, refresh])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleUpdate = async (payload) => {
    await updateEndpoint(endpointId, payload)
    await onRequestsChanged()
    setEditOpen(false)
  }

  if (!endpoint) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">{endpoint.name || 'Untitled endpoint'}</Typography>
          {endpoint.description && (
            <Typography variant="body2" color="text.secondary">
              {endpoint.description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<ShareIcon />}
            color={endpoint.share_token ? 'success' : 'primary'}
            onClick={() => setShareOpen(true)}
          >
            {endpoint.share_token ? 'Shared' : 'Share'}
          </Button>
          <Button startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button startIcon={<DeleteIcon />} color="error" onClick={() => setDeleteConfirmOpen(true)}>
            Delete
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          label="Your unique URL"
          value={hookUrl}
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
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip size="small" label={`Responds ${endpoint.response_status}`} />
          <Chip size="small" label={endpoint.response_content_type} variant="outlined" />
          {endpoint.share_token && (
            <Chip size="small" color="success" variant="outlined" icon={<ShareIcon />} label="Shared publicly" />
          )}
        </Stack>
      </Paper>

      <RequestsPanel
        requestCount={endpoint.request_count}
        fetchPage={fetchPage}
        fetchDetail={fetchDetail}
        openStream={openStream}
        onRequestsChanged={onRequestsChanged}
        emptyMessage="No calls received yet. Send a request to the URL above."
      />

      <EndpointFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initialValues={endpoint}
        title="Edit endpoint"
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        endpointId={endpointId}
        shareToken={endpoint.share_token}
        onChange={loadEndpoint}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => onDelete(endpointId)}
        title="Delete this endpoint?"
        description="This permanently deletes the endpoint and every request it has recorded. This can't be undone."
        confirmLabel="Delete"
        confirmColor="error"
      />
    </Box>
  )
}
