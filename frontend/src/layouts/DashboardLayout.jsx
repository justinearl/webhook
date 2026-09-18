import { useCallback, useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import WebhookIcon from '@mui/icons-material/Webhook'
import { useAuth } from '../context/AuthContext'
import { createEndpoint, deleteEndpoint, listEndpoints } from '../api/endpoints'
import EndpointFormDialog from '../components/EndpointFormDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import ColorModeToggle from '../components/ColorModeToggle'

const DRAWER_WIDTH = 280

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { endpointId } = useParams()
  const [endpoints, setEndpoints] = useState([])
  const [endpointsLoading, setEndpointsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const refresh = useCallback(async () => {
    const data = await listEndpoints()
    setEndpoints(data)
    return data
  }, [])

  useEffect(() => {
    refresh().finally(() => setEndpointsLoading(false))
  }, [refresh])

  useEffect(() => {
    if (!endpointsLoading && !endpointId && endpoints.length > 0) {
      navigate(`/endpoints/${endpoints[0].id}`, { replace: true })
    }
  }, [endpointsLoading, endpointId, endpoints, navigate])

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

  const handleSelectEndpoint = (id) => {
    navigate(`/endpoints/${id}`)
    setMobileOpen(false)
  }

  const drawerContent = (
    <>
      <Toolbar />
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          New endpoint
        </Button>
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 3, pt: 1.5, pb: 0.5, display: 'block' }}>
        Endpoints
      </Typography>
      <List dense disablePadding sx={{ overflowY: 'auto', pb: 2 }}>
        {endpointsLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <ListItemButton key={i} disabled>
              <ListItemText primary={<Skeleton width="60%" />} />
              <Skeleton width={28} height={20} />
            </ListItemButton>
          ))}
        {!endpointsLoading &&
          endpoints.map((ep) => {
            const selected = ep.id === endpointId
            return (
              <ListItemButton key={ep.id} selected={selected} onClick={() => handleSelectEndpoint(ep.id)}>
                <ListItemText
                  primary={ep.name || 'Untitled endpoint'}
                  slotProps={{
                    primary: {
                      noWrap: true,
                      sx: {
                        fontWeight: selected ? 600 : 500,
                        color: ep.name ? 'text.primary' : 'text.secondary',
                        fontStyle: ep.name ? 'normal' : 'italic',
                      },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    ml: 1,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: selected ? 'primary.main' : 'text.secondary',
                    bgcolor: 'action.selected',
                  }}
                >
                  {ep.request_count}
                </Typography>
              </ListItemButton>
            )
          })}
        {!endpointsLoading && endpoints.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 3, py: 1 }}>
            No endpoints yet. Create one to get started.
          </Typography>
        )}
      </List>
    </>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <WebhookIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Webhook Catcher
          </Typography>
          <ColorModeToggle />
          {user && (
            <>
              <Avatar src={user.picture} sx={{ width: 28, height: 28, ml: 0.5, fontSize: 13 }}>
                {user.name?.[0]}
              </Avatar>
              <Typography variant="body2" sx={{ mr: 0.5, display: { xs: 'none', sm: 'block' } }}>
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

      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

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
