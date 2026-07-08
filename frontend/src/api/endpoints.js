import api from './client'

export const listEndpoints = () => api.get('/endpoints').then((r) => r.data)
export const createEndpoint = (data) => api.post('/endpoints', data).then((r) => r.data)
export const getEndpoint = (id) => api.get(`/endpoints/${id}`).then((r) => r.data)
export const updateEndpoint = (id, data) => api.patch(`/endpoints/${id}`, data).then((r) => r.data)
export const deleteEndpoint = (id) => api.delete(`/endpoints/${id}`)
export const listRequests = (id) => api.get(`/endpoints/${id}/requests`).then((r) => r.data)
export const getRequest = (id, requestId) =>
  api.get(`/endpoints/${id}/requests/${requestId}`).then((r) => r.data)
