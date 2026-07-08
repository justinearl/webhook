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
        height: '80vh',
        color: 'text.secondary',
      }}
    >
      <WebhookIcon sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h6">Select an endpoint or create a new one</Typography>
    </Box>
  )
}
