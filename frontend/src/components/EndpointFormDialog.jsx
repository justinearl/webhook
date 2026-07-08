import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'

const CONTENT_TYPES = ['application/json', 'text/plain', 'text/html', 'application/xml']

const DEFAULTS = {
  name: '',
  description: '',
  response_status: 200,
  response_content_type: 'application/json',
  response_body: '',
  response_headers: '{}',
}

export default function EndpointFormDialog({ open, onClose, onSubmit, initialValues, title }) {
  const [form, setForm] = useState(DEFAULTS)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setSubmitting(false)
    if (initialValues) {
      setForm({
        ...DEFAULTS,
        ...initialValues,
        response_headers: JSON.stringify(initialValues.response_headers ?? {}, null, 2),
      })
    } else {
      setForm(DEFAULTS)
    }
  }, [open, initialValues])

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    let headers
    try {
      headers = JSON.parse(form.response_headers || '{}')
    } catch {
      setError('Response headers must be valid JSON')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        name: form.name,
        description: form.description,
        response_status: Number(form.response_status) || 200,
        response_content_type: form.response_content_type,
        response_body: form.response_body,
        response_headers: headers,
      })
    } catch (e) {
      setError(e?.response?.data?.detail || 'Something went wrong, please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Name" value={form.name} onChange={handleChange('name')} fullWidth autoFocus />
          <TextField
            label="Description"
            value={form.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Response status"
              type="number"
              value={form.response_status}
              onChange={handleChange('response_status')}
              sx={{ width: 180 }}
            />
            <TextField
              select
              label="Response content type"
              value={form.response_content_type}
              onChange={handleChange('response_content_type')}
              fullWidth
            >
              {CONTENT_TYPES.map((ct) => (
                <MenuItem key={ct} value={ct}>
                  {ct}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Response body (optional)"
            value={form.response_body}
            onChange={handleChange('response_body')}
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            label="Response headers (JSON, optional)"
            value={form.response_headers}
            onChange={handleChange('response_headers')}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
