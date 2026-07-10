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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import RefreshIcon from '@mui/icons-material/Refresh'
import { getEndpoint, listRequests, updateEndpoint } from '../api/endpoints'
import { streamEndpointRequests } from '../api/stream'
import EndpointFormDialog from '../components/EndpointFormDialog'
import RequestDetailDialog from '../components/RequestDetailDialog'
import ConfirmDialog from '../components/ConfirmDialog'

const STREAM_RETRY_MS = 2000
const PAGE_SIZE = 25

const METHOD_COLORS = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
}

export default function EndpointDetailPage() {
  const { endpointId } = useParams()
  const { refresh, onDelete } = useOutletContext()
  const [endpoint, setEndpoint] = useState(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [copied, setCopied] = useState(false)
  const [live, setLive] = useState(false)

  const hookUrl = `${window.location.origin}/hook/${endpointId}`

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ep, page] = await Promise.all([
        getEndpoint(endpointId),
        listRequests(endpointId, { limit: PAGE_SIZE }),
      ])
      setEndpoint(ep)
      setRequests(page.items)
      setHasMore(page.has_more)
    } finally {
      setLoading(false)
    }
  }, [endpointId])

  const loadMore = async () => {
    if (requests.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = requests[requests.length - 1]
      const page = await listRequests(endpointId, { limit: PAGE_SIZE, before: oldest.created_at })
      setRequests((prev) => [...prev, ...page.items])
      setHasMore(page.has_more)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    // Clear stale data immediately so switching endpoints never shows the wrong one mid-fetch.
    setEndpoint(null)
    load()
  }, [endpointId, load])

  useEffect(() => {
    let stopped = false
    let controller

    async function connect() {
      while (!stopped) {
        controller = new AbortController()
        setLive(false)
        try {
          await streamEndpointRequests(endpointId, {
            signal: controller.signal,
            onOpen: () => setLive(true),
            onEvent: (event) => {
              setRequests((prev) => (prev.some((r) => r.id === event.id) ? prev : [event, ...prev]))
              refresh()
            },
          })
        } catch {
          // Connection dropped (network hiccup, proxy timeout, server restart) -> retry below.
        }
        setLive(false)
        if (stopped) break
        await new Promise((resolve) => setTimeout(resolve, STREAM_RETRY_MS))
      }
    }

    connect()
    return () => {
      stopped = true
      controller?.abort()
    }
  }, [endpointId, refresh])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleUpdate = async (payload) => {
    await updateEndpoint(endpointId, payload)
    await load()
    await refresh()
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
        </Stack>
      </Paper>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1">Requests ({endpoint.request_count})</Typography>
          {live && (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label="Live"
              icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important' }} />}
            />
          )}
        </Stack>
        <IconButton onClick={load} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
        </IconButton>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Method</TableCell>
              <TableCell>Path</TableCell>
              <TableCell>Client IP</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedRequestId(r.id)}>
                <TableCell>
                  <Chip size="small" color={METHOD_COLORS[r.method] || 'default'} label={r.method} />
                </TableCell>
                <TableCell>{r.path}</TableCell>
                <TableCell>{r.client_ip}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No calls received yet. Send a request to the URL above.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : null}
          >
            Load more
          </Button>
        </Box>
      )}

      <EndpointFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initialValues={endpoint}
        title="Edit endpoint"
      />

      <RequestDetailDialog
        endpointId={endpointId}
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
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
