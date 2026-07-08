import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Navigate } from 'react-router-dom'
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import WebhookIcon from '@mui/icons-material/Webhook'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loginWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper elevation={3} sx={{ p: 5, maxWidth: 420, width: '100%' }}>
        <Stack spacing={3} alignItems="center">
          <WebhookIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h5" fontWeight={700}>
            Webhook Catcher
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Sign in with Google to create callback endpoints and inspect every request they receive.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}
          {loading ? (
            <CircularProgress size={32} />
          ) : (
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  setError('')
                  setLoading(true)
                  await loginWithGoogle(credentialResponse.credential)
                } catch (e) {
                  setError(e?.response?.data?.detail || 'Login failed, please try again.')
                } finally {
                  setLoading(false)
                }
              }}
              onError={() => setError('Google sign-in failed.')}
            />
          )}
        </Stack>
      </Paper>
    </Box>
  )
}
