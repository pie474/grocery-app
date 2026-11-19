import { useCallback, useEffect, useRef, useState } from 'react'

// The newest created_at this device had on screen when it last stopped
// looking at the list.
const SEEN_KEY = 'grocery-app:last-seen-created-at'

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
    // storage blocked: highlights just won't survive a restart
  }
}

function latestCreatedAt(entries, floor) {
  return entries.reduce((max, e) => (e.created_at && e.created_at > max ? e.created_at : max), floor)
}

// Which list entries someone else added since this device last looked.
//
// "Looked" ends when the app is hidden: switching apps, locking the
// phone, closing the tab. That's the one signal an installed PWA gives
// reliably (a PWA killed from the app switcher gets no pagehide, but it
// was hidden first). Window blur isn't used, since opening the camera or
// photo picker would clear highlights nobody had read yet.
//
// The baseline is a created_at value, not this phone's clock, so clock
// skew between phones and the server can't hide or invent highlights.
// On a device's first visit nothing counts as new.
//
// Entries with no added_by are never highlighted: with no member picked
// on this phone, that's what our own additions look like.
export default function useNewEntries(entries, ready, currentMemberId) {
  const [seenAt, setSeenAt] = useState(readSeen)
  // expanded since they were highlighted; cleared when the baseline moves
  const [dismissed, setDismissed] = useState(() => new Set())

  const latest = useRef({ entries, ready, seenAt })
  latest.current = { entries, ready, seenAt }

  // First visit on this device: what's already there isn't new.
  useEffect(() => {
    if (ready && seenAt === null) {
      const baseline = latestCreatedAt(entries, '')
      setSeenAt(baseline)
      writeSeen(baseline)
    }
  }, [ready, seenAt, entries])

  useEffect(() => {
    // Saved right here, not in an effect, because the page may be frozen
    // or killed straight after being hidden.
    function markSeen() {
      const { entries, ready, seenAt } = latest.current
      if (!ready) return
      // never backwards: deleting the newest entry mustn't resurface others
      const baseline = latestCreatedAt(entries, seenAt || '')
      writeSeen(baseline)
      setSeenAt(baseline)
      setDismissed(new Set())
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') markSeen()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', markSeen)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', markSeen)
    }
  }, [])

  const isNew = useCallback(
    (entry) =>
      seenAt !== null &&
      !!entry.created_at &&
      entry.created_at > seenAt &&
      !!entry.added_by &&
      entry.added_by !== currentMemberId &&
      !dismissed.has(entry.id),
    [seenAt, currentMemberId, dismissed],
  )

  const dismiss = useCallback((id) => {
    setDismissed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  return { isNew, dismiss }
}
