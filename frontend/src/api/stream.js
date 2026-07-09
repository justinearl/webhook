// Native fetch + ReadableStream instead of EventSource: EventSource can't send
// custom headers, and this app authenticates with a Bearer token, not cookies.
export async function streamEndpointRequests(endpointId, { onEvent, onOpen, signal }) {
  const token = localStorage.getItem('webhook_token')
  const response = await fetch(`/api/endpoints/${endpointId}/stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

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
