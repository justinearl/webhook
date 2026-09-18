import { useCallback, useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/EditOutlined'
import ShareIcon from '@mui/icons-material/ShareOutlined'
import {
  clearRequests,
  deleteRequest,
  getEndpoint,
  getRequest,
  listRequests,
  updateEndpoint,
} from '../api/endpoints'
import { streamEndpointRequests } from '../api/stream'
import EndpointFormDialog from '../components/EndpointFormDialog'
import RequestsPanel from '../components/RequestsPanel'
import ShareDialog from '../components/ShareDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import HookUrlField from '../components/HookUrlField'

export default function EndpointDetailPage() {
  const { endpointId } = useParams()
  const { refresh, onDelete } = useOutletContext()
  const [endpoint, setEndpoint] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const hookUrl = `${window.location.origin}/hook/${endpointId}`

  const loadEndpoint = useCallback(async () => {
    setEndpoint(await getEndpoint(endpointId))
  }, [endpointId])

  useEffect(() => {
    // Clear stale data immediately so switching endpoints never shows the wrong
    // one mid-fetch, and drop the old fetch's result if it lands after we moved on.
    setEndpoint(null)
    let stale = false
    getEndpoint(endpointId).then((data) => {
      if (!stale) setEndpoint(data)
    })
    return () => {
      stale = true
    }
  }, [endpointId])

  // Stable identities: RequestsPanel reconnects its stream whenever these change.
  const fetchPage = useCallback((params) => listRequests(endpointId, params), [endpointId])
  const fetchDetail = useCallback((requestId) => getRequest(endpointId, requestId), [endpointId])
  const openStream = useCallback(
    (handlers) => streamEndpointRequests(endpointId, handlers),
    [endpointId],
  )
  const removeRequest = useCallback((requestId) => deleteRequest(endpointId, requestId), [endpointId])
  const removeAllRequests = useCallback(() => clearRequests(endpointId), [endpointId])
  const onRequestsChanged = useCallback(async () => {
    await Promise.all([loadEndpoint(), refresh()])
  }, [loadEndpoint, refresh])

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
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2.5, justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" noWrap>
            {endpoint.name || 'Untitled endpoint'}
          </Typography>
          {endpoint.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {endpoint.description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={() => setShareOpen(true)}
            sx={endpoint.share_token ? { color: 'success.main', borderColor: 'success.main' } : undefined}
          >
            {endpoint.share_token ? 'Shared' : 'Share'}
          </Button>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteConfirmOpen(true)}
            sx={{ color: 'error.main', '&:hover': { borderColor: 'error.main' } }}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <HookUrlField url={hookUrl} label="Your unique URL" />
        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" variant="outlined" label={`Responds ${endpoint.response_status}`} />
          <Chip size="small" variant="outlined" label={endpoint.response_content_type} />
          {endpoint.share_token && (
            <Chip size="small" color="success" variant="outlined" icon={<ShareIcon />} label="Shared publicly" />
          )}
        </Stack>
      </Paper>

      <RequestsPanel
        requestCount={endpoint.request_count}
        hookUrl={hookUrl}
        fetchPage={fetchPage}
        fetchDetail={fetchDetail}
        openStream={openStream}
        deleteRequest={removeRequest}
        clearRequests={removeAllRequests}
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
