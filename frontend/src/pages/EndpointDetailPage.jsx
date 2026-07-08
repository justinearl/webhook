import { useCallback, useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
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
import RefreshIcon from '@mui/icons-material/Refresh'
import { getEndpoint, listRequests, updateEndpoint } from '../api/endpoints'
import EndpointFormDialog from '../components/EndpointFormDialog'
import RequestDetailDialog from '../components/RequestDetailDialog'
import ConfirmDialog from '../components/ConfirmDialog'

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
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [copied, setCopied] = useState(false)

  const hookUrl = `${window.location.origin}/hook/${endpointId}`

  const load = useCallback(async () => {
    const [ep, reqs] = await Promise.all([getEndpoint(endpointId), listRequests(endpointId)])
    setEndpoint(ep)
    setRequests(reqs)
  }, [endpointId])

  useEffect(() => {
    load()
  }, [load])

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

  if (!endpoint) return null

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
        <Typography variant="subtitle1">Requests ({requests.length})</Typography>
        <IconButton onClick={load}>
          <RefreshIcon />
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
