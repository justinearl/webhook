import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('webhook_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''
    // A 401 from anything but the login call itself means the session token is
    // expired or invalid. Drop it and start over rather than leaving the
    // dashboard up with every request failing.
    if (status === 401 && !url.startsWith('/auth/login') && localStorage.getItem('webhook_token')) {
      localStorage.removeItem('webhook_token')
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

export default api
