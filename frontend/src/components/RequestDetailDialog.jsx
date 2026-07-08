import { useEffect, useState } from 'react'
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
  Typography,
} from '@mui/material'
import { getRequest } from '../api/endpoints'

export default function RequestDetailDialog({ endpointId, requestId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (requestId) {
      setDetail(null)
      setLoading(true)
      getRequest(endpointId, requestId).then((data) => {
        setDetail(data)
        setLoading(false)
      })
    } else {
      setDetail(null)
      setLoading(false)
    }
  }, [endpointId, requestId])

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
              <Typography variant="subtitle2" gutterBottom>
                Body
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: 'action.hover',
                  p: 2,
                  borderRadius: 1,
                  overflowX: 'auto',
                  fontSize: 13,
                  m: 0,
                }}
              >
                {detail.body || '(empty)'}
              </Box>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
