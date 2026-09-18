import axios from 'axios'

// Deliberately not the shared `client.js` instance: a share link must work for
// a signed-out viewer, so these calls never attach an Authorization header.
const publicApi = axios.create({ baseURL: '/api' })

const base = (token) => `/shared/${encodeURIComponent(token)}`

export const getSharedEndpoint = (token) => publicApi.get(base(token)).then((r) => r.data)
export const listSharedRequests = (token, { limit = 25, before, method, q } = {}) =>
  publicApi
    .get(`${base(token)}/requests`, { params: { limit, before, method: method || undefined, q: q || undefined } })
    .then((r) => r.data)
export const getSharedRequest = (token, requestId) =>
  publicApi.get(`${base(token)}/requests/${requestId}`).then((r) => r.data)
