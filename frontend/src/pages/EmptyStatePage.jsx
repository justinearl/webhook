import { Box, Typography } from '@mui/material'
import WebhookIcon from '@mui/icons-material/Webhook'

export default function EmptyStatePage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          mb: 2.5,
          color: 'primary.main',
          bgcolor: (t) => `rgba(${t.vars.palette.primary.mainChannel} / 0.12)`,
        }}
      >
        <WebhookIcon sx={{ fontSize: 32 }} />
      </Box>
      <Typography variant="h6" gutterBottom>
        No endpoint selected
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        Pick one from the sidebar, or create a new endpoint to get a URL you can send webhooks to.
      </Typography>
    </Box>
  )
}
