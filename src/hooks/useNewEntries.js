import { useCallback, useEffect, useRef, useState } from 'react'

const LAST_MEMBER_KEY = 'grocery-app:last-member-id' // set by AddItemForm
const SEEN_KEY = 'grocery-app:last-seen-created-at'
const EPOCH = '1970-01-01T00:00:00.000Z'

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function writeSeen(value) {
  try {
    localStorage.setItem(SEEN_KEY, value)
  } catch {
    // storage unavailable (private mode etc.); highlights just won't persist
  }
}

function latestCreatedAt(entries) {
  return entries.reduce((max, e) => (e.created_at > max ? e.created_at : max), EPOCH)
}

// Tracks which list entries were added by someone else since you last
// looked at the app. "Looked" means the tab was last visible and focused:
// the baseline moves forward whenever the tab is hidden or the window
// loses focus, and it is saved per device so it survives a reload.
//
// The baseline is a created_at value rather than the device's clock, so
// clock skew between phones and the server can't hide or invent highlights.
//
// Who counts as "someone else" is the member picked in the add form on this
// device; entries with no added_by are never highlighted.
export default function useNewEntries(entries, ready) {
  const [seenAt, setSeenAt] = useState(readSeen)
  const [dismissed, setDismissed] = useState(() => new Set())
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const readyRef = useRef(ready)
  readyRef.current = ready
  const seenRef = useRef(seenAt)
  seenRef.current = seenAt

  // Saved synchronously (not via the effect below) so it still lands when
  // the page is being closed or reloaded.
  const markSeen = useCallback(() => {
    if (!readyRef.current) return
    const baseline = latestCreatedAt(entriesRef.current)
    const next = seenRef.current && seenRef.current > baseline ? seenRef.current : baseline
    seenRef.current = next
    writeSeen(next)
    setSeenAt(next)
    setDismissed(new Set())
  }, [])

  // First visit on this device: nothing that's already there counts as new.
  useEffect(() => {
    if (ready && seenAt === null) setSeenAt(latestCreatedAt(entries))
  }, [ready, seenAt, entries])

  useEffect(() => {
    if (seenAt !== null) writeSeen(seenAt)
  }, [seenAt])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') markSeen()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', markSeen)
    window.addEventListener('pagehide', markSeen)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', markSeen)
      window.removeEventListener('pagehide', markSeen)
    }
  }, [markSeen])

  const myId = (() => {
    try {
      return localStorage.getItem(LAST_MEMBER_KEY) || ''
    } catch {
      return ''
    }
  })()

  const isNew = useCallback(
    (entry) =>
      seenAt !== null &&
      entry.status !== 'got' &&
      !!entry.added_by &&
      entry.added_by !== myId &&
      entry.created_at > seenAt &&
      !dismissed.has(entry.id),
    [seenAt, myId, dismissed],
  )

  const dismiss = useCallback((id) => {
    setDismissed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  return { isNew, dismiss }
}
