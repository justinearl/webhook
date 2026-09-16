import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import RefreshIcon from '@mui/icons-material/Refresh'
import RequestDetailDialog from './RequestDetailDialog'

const STREAM_RETRY_MS = 2000
const PAGE_SIZE = 25

const METHOD_COLORS = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
}

/**
 * The request log table, its live-update stream and pagination.
 *
 * Data access is injected so the owner's dashboard and a public share link can
 * render the same panel against their own (differently authorised) endpoints.
 * Every callback prop must be referentially stable (useCallback) — the stream
 * effect keys off them and would otherwise reconnect on every render.
 */
export default function RequestsPanel({
  requestCount,
  fetchPage,
  fetchDetail,
  openStream,
  onRequestsChanged,
  emptyMessage = 'No calls received yet.',
}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [live, setLive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchPage({ limit: PAGE_SIZE })
      setRequests(page.items)
      setHasMore(page.has_more)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => {
    // Clear stale rows immediately so switching endpoints never shows the wrong ones mid-fetch.
    setRequests([])
    setHasMore(false)
    load()
  }, [load])

  useEffect(() => {
    let stopped = false
    let controller

    async function connect() {
      while (!stopped) {
        controller = new AbortController()
        setLive(false)
        try {
          await openStream({
            signal: controller.signal,
            onOpen: () => setLive(true),
            onEvent: (event) => {
              setRequests((prev) => (prev.some((r) => r.id === event.id) ? prev : [event, ...prev]))
              onRequestsChanged?.()
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
  }, [openStream, onRequestsChanged])

  const loadMore = async () => {
    if (requests.length === 0) return
    setLoadingMore(true)
    try {
      const oldest = requests[requests.length - 1]
      const page = await fetchPage({ limit: PAGE_SIZE, before: oldest.created_at })
      setRequests((prev) => [...prev, ...page.items])
      setHasMore(page.has_more)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleRefresh = async () => {
    await load()
    onRequestsChanged?.()
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1">Requests ({requestCount})</Typography>
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
        <IconButton onClick={handleRefresh} disabled={loading}>
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
                    {emptyMessage}
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

      <RequestDetailDialog
        requestId={selectedRequestId}
        fetchDetail={fetchDetail}
        onClose={() => setSelectedRequestId(null)}
      />
    </>
  )
}
