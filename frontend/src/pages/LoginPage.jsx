import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Navigate } from 'react-router-dom'
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import WebhookIcon from '@mui/icons-material/Webhook'
import { useAuth } from '../context/AuthContext'
import ColorModeToggle from '../components/ColorModeToggle'

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
        p: 2,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
        <ColorModeToggle />
      </Box>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, maxWidth: 400, width: '100%' }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              bgcolor: (t) => `rgba(${t.vars.palette.primary.mainChannel} / 0.12)`,
            }}
          >
            <WebhookIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Webhook Catcher
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create callback URLs, point any webhook at them, and watch requests arrive in real time.
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}
          {loading ? (
            <CircularProgress size={32} />
          ) : (
            <GoogleLogin
              shape="pill"
              width="300"
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
