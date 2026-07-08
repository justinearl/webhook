import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import LogoutIcon from '@mui/icons-material/Logout'
import WebhookIcon from '@mui/icons-material/Webhook'
import { useAuth } from '../context/AuthContext'
import { createEndpoint, deleteEndpoint, listEndpoints } from '../api/endpoints'
import EndpointFormDialog from '../components/EndpointFormDialog'
import ConfirmDialog from '../components/ConfirmDialog'

const DRAWER_WIDTH = 300

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { endpointId } = useParams()
  const [endpoints, setEndpoints] = useState([])
  const [endpointsLoading, setEndpointsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const refresh = useCallback(async () => {
    const data = await listEndpoints()
    setEndpoints(data)
    return data
  }, [])

  useEffect(() => {
    refresh().finally(() => setEndpointsLoading(false))
  }, [refresh])

  const handleCreate = async (payload) => {
    const created = await createEndpoint(payload)
    await refresh()
    setDialogOpen(false)
    navigate(`/endpoints/${created.id}`)
  }

  const handleDelete = async (id) => {
    await deleteEndpoint(id)
    const remaining = await refresh()
    if (endpointId === id) {
      navigate(remaining.length ? `/endpoints/${remaining[0].id}` : '/')
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }} color="inherit" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <WebhookIcon color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Webhook Catcher
          </Typography>
          {user && (
            <>
              <Avatar src={user.picture} sx={{ width: 32, height: 32, mr: 1 }}>
                {user.name?.[0]}
              </Avatar>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user.name}
              </Typography>
              <Tooltip title="Log out">
                <IconButton onClick={() => setLogoutConfirmOpen(true)}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New endpoint
          </Button>
        </Box>
        <Divider />
        <List sx={{ overflowY: 'auto' }}>
          {endpointsLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <ListItemButton key={i} disabled>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} />
                </ListItemAvatar>
                <ListItemText primary={<Skeleton width="70%" />} secondary={<Skeleton width="40%" />} />
              </ListItemButton>
            ))}
          {!endpointsLoading &&
            endpoints.map((ep) => (
              <ListItemButton
                key={ep.id}
                selected={ep.id === endpointId}
                onClick={() => navigate(`/endpoints/${ep.id}`)}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.light' }}>{(ep.name || ep.id)[0].toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={ep.name || ep.id.slice(0, 8)}
                  secondary={`${ep.request_count} call${ep.request_count === 1 ? '' : 's'}`}
                />
              </ListItemButton>
            ))}
          {!endpointsLoading && endpoints.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              No endpoints yet — create one to get started.
            </Typography>
          )}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet context={{ endpoints, refresh, onDelete: handleDelete }} />
      </Box>

      <EndpointFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
        title="New callback endpoint"
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={logout}
        title="Log out?"
        description="You'll need to sign in with Google again to access your endpoints."
        confirmLabel="Log out"
        confirmColor="error"
      />
    </Box>
  )
}
