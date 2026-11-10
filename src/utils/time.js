// Reads naturally after "added" or "last bought": "just now", "20 min ago",
// "5 hr ago", "yesterday", "3 days ago", then a date ("Oct 11", with the
// year once it isn't this year). Lower case, since it sits mid-sentence.
export function formatRelativeTime(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  // a timestamp slightly in the future (another phone's clock) is "just now"
  const mins = Math.floor((now - date) / 60000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`

  const hours = Math.floor(mins / 60)
  // calendar days, so 11pm seen at 9am the next morning is "yesterday"
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
  // but a couple of hours across midnight is still counted in hours
  if (days === 0 || hours < 6) return `${hours} hr ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
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
