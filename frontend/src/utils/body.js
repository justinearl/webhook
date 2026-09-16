/**
 * Work out how a recorded request body should be displayed.
 *
 * Returns one of:
 *   { kind: 'empty' }
 *   { kind: 'json', text }              - pretty-printed JSON
 *   { kind: 'form', fields: [{ key, value, json }] } - form-encoded, json set
 *                                         when that field's value is itself JSON
 *   { kind: 'text', text }              - anything we can't decode
 *
 * The raw body is never modified — this only decides how to render it, and the
 * dialog always offers the raw view alongside.
 */
export function decodeBody(body, contentType = '') {
  if (!body) return { kind: 'empty' }

  const type = (contentType.split(';')[0] || '').trim().toLowerCase()

  if (type === 'application/x-www-form-urlencoded') {
    const fields = parseFormFields(body)
    if (fields.length > 0) return { kind: 'form', fields }
  }

  // Sniff rather than trust the header: senders routinely post JSON as
  // text/plain, or with no content type at all.
  const pretty = prettyJson(body)
  if (pretty) return { kind: 'json', text: pretty }

  return { kind: 'text', text: body }
}

function parseFormFields(body) {
  try {
    return [...new URLSearchParams(body).entries()].map(([key, value]) => ({
      key,
      value,
      json: prettyJson(value),
    }))
  } catch {
    return []
  }
}

/** Pretty-print `text` if it is a JSON object or array, else null. */
export function prettyJson(text) {
  const trimmed = (text || '').trim()
  // Bare scalars ("5", "true", a quoted string) are valid JSON but gain
  // nothing from being reformatted, so only objects and arrays qualify.
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return null
  }
}
