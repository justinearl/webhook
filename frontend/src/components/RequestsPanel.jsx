import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
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
import ClearIcon from '@mui/icons-material/Close'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import ConfirmDialog from './ConfirmDialog'
import RequestDetailDialog from './RequestDetailDialog'
import { StreamRejectedError } from '../api/stream'
import { formatRelative } from '../utils/time'

const STREAM_RETRY_MS = 2000
const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
const CLOCK_TICK_MS = 15_000
const NEW_ROW_HIGHLIGHT_MS = 2500

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const METHOD_COLORS = {
  GET: 'success',
  POST: 'info',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'error',
}

/**
 * The request log table, its live-update stream, filters and pagination.
 *
 * Data access is injected so the owner's dashboard and a public share link can
 * render the same panel against their own (differently authorised) endpoints.
 * Every callback prop must be referentially stable (useCallback) — the stream
 * effect keys off them and would otherwise reconnect on every render.
 *
 * `deleteRequest` / `clearRequests` are optional: when absent (share links)
 * the destructive controls are hidden.
 */
export default function RequestsPanel({
  requestCount,
  hookUrl,
  fetchPage,
  fetchDetail,
  openStream,
  deleteRequest,
  clearRequests,
  onRequestsChanged,
  emptyMessage = 'No calls received yet.',
}) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [live, setLive] = useState(false)
  const [streamError, setStreamError] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const [method, setMethod] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('') // `search`, debounced
  const filtering = Boolean(method || query)

  // Re-render on a timer so the relative timestamps stay honest.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Ids of rows that arrived over the live stream, kept briefly for the highlight.
  const [newIds, setNewIds] = useState(() => new Set())

  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [search])

  // Bumped whenever the panel switches data source or filters so an in-flight
  // page fetch for the previous parameters can't overwrite the new rows.
  const loadVersion = useRef(0)

  const load = useCallback(async () => {
    const version = ++loadVersion.current
    setLoading(true)
    try {
      const page = await fetchPage({ limit: PAGE_SIZE, method, q: query })
      if (version !== loadVersion.current) return
      setRequests(page.items)
      setHasMore(page.has_more)
    } finally {
      if (version === loadVersion.current) setLoading(false)
    }
  }, [fetchPage, method, query])

  useEffect(() => {
    // Clear stale rows immediately so switching endpoints never shows the wrong ones mid-fetch.
    setRequests([])
    setHasMore(false)
    load()
  }, [load])

  useEffect(() => {
    setStreamError('')
    setMethod('')
    setSearch('')
    setQuery('')
  }, [openStream])

  // The stream effect must not restart when filters change, so it reads the
  // latest filter state and loader through refs.
  const filteringRef = useRef(filtering)
  const loadRef = useRef(load)
  useEffect(() => {
    filteringRef.current = filtering
    loadRef.current = load
  }, [filtering, load])

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
              if (filteringRef.current) {
                // A summary has no body, so we can't tell client-side whether
                // it matches the search. Let the server decide.
                loadRef.current()
              } else {
                setRequests((prev) => (prev.some((r) => r.id === event.id) ? prev : [event, ...prev]))
                setNewIds((prev) => new Set(prev).add(event.id))
                setTimeout(() => {
                  setNewIds((prev) => {
                    const next = new Set(prev)
                    next.delete(event.id)
                    return next
                  })
                }, NEW_ROW_HIGHLIGHT_MS)
              }
              onRequestsChanged?.()
            },
          })
        } catch (err) {
          if (err instanceof StreamRejectedError) {
            // 401/404: the session expired or the endpoint is gone. Retrying
            // would just hammer the server every two seconds forever.
            if (!stopped) setStreamError('Live updates stopped. Refresh the page to reconnect.')
            setLive(false)
            return
          }
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
      const page = await fetchPage({ limit: PAGE_SIZE, before: oldest.created_at, method, q: query })
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

  const handleDeleteRequest = async (requestId) => {
    await deleteRequest(requestId)
    setRequests((prev) => prev.filter((r) => r.id !== requestId))
    setSelectedRequestId(null)
    onRequestsChanged?.()
  }

  const handleClearAll = async () => {
    await clearRequests()
    setRequests([])
    setHasMore(false)
    onRequestsChanged?.()
  }

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={{ mb: 1 }}
      >
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
          {streamError && (
            <Tooltip title={streamError}>
              <Chip size="small" color="warning" variant="outlined" label="Offline" />
            </Tooltip>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            sx={{ minWidth: 110 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">All methods</MenuItem>
            {METHODS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Search path or body"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 180 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={handleRefresh} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          {clearRequests && (
            <Tooltip title="Clear all requests">
              <span>
                <IconButton
                  color="error"
                  onClick={() => setClearConfirmOpen(true)}
                  disabled={requestCount === 0}
                >
                  <DeleteSweepIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 100 }}>Method</TableCell>
              <TableCell>Path</TableCell>
              <TableCell sx={{ width: 160 }}>Client IP</TableCell>
              <TableCell sx={{ width: 140 }}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((r) => (
              <TableRow
                key={r.id}
                hover
                className={newIds.has(r.id) ? 'row-new' : undefined}
                sx={{ cursor: 'pointer' }}
                onClick={() => setSelectedRequestId(r.id)}
              >
                <TableCell>
                  <Chip size="small" color={METHOD_COLORS[r.method] || 'default'} label={r.method} />
                </TableCell>
                <TableCell
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                  }}
                >
                  {r.path}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{r.client_ip}</TableCell>
                <TableCell>
                  <Tooltip title={new Date(r.created_at).toLocaleString()}>
                    <span>{formatRelative(r.created_at, now)}</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {loading ? 'Loading…' : filtering ? 'No requests match these filters.' : emptyMessage}
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
        hookUrl={hookUrl}
        fetchDetail={fetchDetail}
        onDelete={deleteRequest ? handleDeleteRequest : undefined}
        onClose={() => setSelectedRequestId(null)}
      />

      {clearRequests && (
        <ConfirmDialog
          open={clearConfirmOpen}
          onClose={() => setClearConfirmOpen(false)}
          onConfirm={handleClearAll}
          title="Clear all requests?"
          description={`This permanently deletes all ${requestCount} recorded request${
            requestCount === 1 ? '' : 's'
          } on this endpoint. The endpoint itself stays. This can't be undone.`}
          confirmLabel="Clear all"
          confirmColor="error"
        />
      )}
    </>
  )
}
