import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
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

  useEffect(() => {
    if (!open) return
    setError('')
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

  const handleSubmit = () => {
    let headers
    try {
      headers = JSON.parse(form.response_headers || '{}')
    } catch {
      setError('Response headers must be valid JSON')
      return
    }
    onSubmit({
      name: form.name,
      description: form.description,
      response_status: Number(form.response_status) || 200,
      response_content_type: form.response_content_type,
      response_body: form.response_body,
      response_headers: headers,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
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
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
