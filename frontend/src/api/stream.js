// Native fetch + ReadableStream instead of EventSource: EventSource can't send
// custom headers, and this app authenticates with a Bearer token, not cookies.

/** Thrown when the server refuses the stream outright (4xx). Retrying won't help. */
export class StreamRejectedError extends Error {
  constructor(status) {
    super(`Stream request rejected with status ${status}`)
    this.name = 'StreamRejectedError'
    this.status = status
  }
}

async function streamSSE(url, { onEvent, onOpen, signal, headers = {} }) {
  const response = await fetch(url, { headers, signal })

  if (response.status >= 400 && response.status < 500) {
    throw new StreamRejectedError(response.status)
  }
  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed with status ${response.status}`)
  }
  onOpen?.()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const chunks = buffer.split('\n\n')
    buffer = chunks.pop()

    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '))
      if (!dataLine) continue
      try {
        onEvent(JSON.parse(dataLine.slice('data: '.length)))
      } catch {
        // Ignore malformed chunk
      }
    }
  }
}

export function streamEndpointRequests(endpointId, options) {
  const token = localStorage.getItem('webhook_token')
  return streamSSE(`/api/endpoints/${endpointId}/stream`, {
    ...options,
    headers: { Authorization: `Bearer ${token}` },
  })
}

// Share links are public -> no auth header, same event shape.
export function streamSharedRequests(shareToken, options) {
  return streamSSE(`/api/shared/${encodeURIComponent(shareToken)}/stream`, options)
}
