export function formatRelativeTime(dateStr) {
  if (!dateStr) return null
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.round(diffMs / 60000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// "Today", "Yesterday", a weekday name within the last week, otherwise a
// short date (with the year once it isn't this year).
export function formatDayLabel(dateStr) {
  const today = startOfDay(new Date())
  const day = startOfDay(new Date(dateStr))
  // rounded so a daylight-saving change doesn't throw it off by one
  const days = Math.round((today - day) / 86400000)

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days > 1 && days < 7) return day.toLocaleDateString(undefined, { weekday: 'long' })

  return day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(day.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
  })
}

export function formatTimeOfDay(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// a key for the local calendar day, for grouping
export function dayKey(dateStr) {
  return startOfDay(new Date(dateStr)).getTime()
}

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
