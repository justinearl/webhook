const UNITS = [
  ['d', 86_400_000],
  ['h', 3_600_000],
  ['m', 60_000],
  ['s', 1_000],
]

/** "just now", "12s ago", "3m ago", ... Falls back to the date past a week. */
export function formatRelative(iso, now = Date.now()) {
  const diff = now - new Date(iso).getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < 5_000) return 'just now'
  if (diff > 7 * 86_400_000) return new Date(iso).toLocaleDateString()
  for (const [suffix, ms] of UNITS) {
    if (diff >= ms) return `${Math.floor(diff / ms)}${suffix} ago`
  }
  return 'just now'
}
