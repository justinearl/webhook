// Headers that describe the original hop rather than the request itself, or
// that curl sets on its own. Replaying them would be wrong or noisy.
const SKIP_HEADERS = new Set(['host', 'content-length', 'connection', 'accept-encoding'])

/** Quote for a POSIX shell: wrap in single quotes, escaping any inside. */
function sh(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

/**
 * Build a curl command that replays a recorded request against `hookUrl`
 * (the endpoint's base URL, without the extra path).
 */
export function toCurl(request, hookUrl) {
  const query = new URLSearchParams(request.query_params || {}).toString()
  const path = request.path && request.path !== '/' ? request.path : ''
  const url = `${hookUrl}${path}${query ? `?${query}` : ''}`

  const lines = []
  const method = (request.method || 'GET').toUpperCase()
  if (method === 'HEAD') lines.push(`curl --head ${sh(url)}`)
  else if (method === 'GET') lines.push(`curl ${sh(url)}`)
  else lines.push(`curl -X ${method} ${sh(url)}`)

  for (const [key, value] of Object.entries(request.headers || {})) {
    if (SKIP_HEADERS.has(key.toLowerCase())) continue
    lines.push(`  -H ${sh(`${key}: ${value}`)}`)
  }

  if (request.body) lines.push(`  --data-raw ${sh(request.body)}`)

  return lines.join(' \\\n')
}
