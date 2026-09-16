import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import CodeBlock from './CodeBlock'
import { decodeBody } from '../utils/body'

/** `fetchDetail(requestId)` is injected so this works for both the owner's
 *  endpoints and a public share link. It must be referentially stable. */
export default function RequestDetailDialog({ requestId, fetchDetail, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    if (requestId) {
      setDetail(null)
      setLoading(true)
      setShowRaw(false)
      fetchDetail(requestId).then((data) => {
        setDetail(data)
        setLoading(false)
      })
    } else {
      setDetail(null)
      setLoading(false)
    }
  }, [fetchDetail, requestId])

  const decoded = useMemo(
    () => decodeBody(detail?.body, detail?.content_type),
    [detail?.body, detail?.content_type],
  )
  const canDecode = decoded.kind === 'json' || decoded.kind === 'form'

  return (
    <Dialog open={Boolean(requestId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Request details</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && detail && (
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={detail.method} color="primary" />
              <Typography variant="body2">{detail.path}</Typography>
              <Typography variant="body2" color="text.secondary">
                from {detail.client_ip}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(detail.created_at).toLocaleString()}
              </Typography>
            </Stack>

            {Object.keys(detail.query_params || {}).length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Query params
                </Typography>
                <Table size="small">
                  <TableBody>
                    {Object.entries(detail.query_params).map(([k, v]) => (
                      <TableRow key={k}>
                        <TableCell sx={{ fontWeight: 600, width: 220 }}>{k}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-all' }}>{v}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Headers
              </Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(detail.headers || {}).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell sx={{ fontWeight: 600, width: 220 }}>{k}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2">Body</Typography>
                  {detail.content_type && (
                    <Chip size="small" variant="outlined" label={detail.content_type} />
                  )}
                </Stack>
                {canDecode && (
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={showRaw ? 'raw' : 'decoded'}
                    onChange={(_, value) => value && setShowRaw(value === 'raw')}
                  >
                    <ToggleButton value="decoded">Decoded</ToggleButton>
                    <ToggleButton value="raw">Raw</ToggleButton>
                  </ToggleButtonGroup>
                )}
              </Stack>

              <RequestBody body={detail.body} decoded={decoded} showRaw={showRaw} />
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RequestBody({ body, decoded, showRaw }) {
  if (decoded.kind === 'empty') {
    return (
      <Typography variant="body2" color="text.secondary">
        (empty)
      </Typography>
    )
  }

  if (showRaw) return <CodeBlock text={body} />

  if (decoded.kind === 'json') return <CodeBlock text={decoded.text} language="json" />

  if (decoded.kind === 'form') {
    return (
      <Stack spacing={2}>
        {decoded.fields.map((field, i) => (
          <Box key={`${field.key}-${i}`}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}
            >
              {field.key}
            </Typography>
            {field.json ? (
              <CodeBlock text={field.json} language="json" maxHeight={320} />
            ) : (
              <CodeBlock text={field.value} maxHeight={220} />
            )}
          </Box>
        ))}
      </Stack>
    )
  }

  return <CodeBlock text={decoded.text} />
}
