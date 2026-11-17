import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// matches --duration in tokens.css: how long the exit animation runs
const EXIT_MS = 200

// A small stack of bottom toasts, newest at the bottom (nearest the
// thumb). toasts: [{ id, message, undo, error, actionLabel }]; App caps
// how many there are and times each one out on its own. A toast shows an
// action button when it has `undo` (labelled actionLabel, "Undo" by
// default), otherwise a plain OK; `error` styles it as a failure message.
// onDismiss(id) removes one.
export default function UndoToast({ toasts = [], onDismiss }) {
  // what's on screen: the current toasts plus any still animating out
  const [shown, setShown] = useState([])
  const [syncedKey, setSyncedKey] = useState('')
  const stackRef = useRef(null)
  // how tall the stack is, so the page can keep that much room at its end
  const [stackHeight, setStackHeight] = useState(0)

  // Brings `shown` in line with `toasts` during render (no flash of the
  // old state): new ones are added, ones that went away start leaving.
  const key = toasts.map((t) => t.id).join(',')
  if (key !== syncedKey) {
    setSyncedKey(key)
    setShown((prev) => {
      const live = new Set(toasts.map((t) => t.id))
      const known = new Set(prev.map((t) => t.id))
      const kept = prev.map((t) => (live.has(t.id) || t.leaving ? t : { ...t, leaving: true }))
      const added = toasts
        .filter((t) => !known.has(t.id))
        .map(({ id, message, error, undo, actionLabel }) => ({
          id,
          message,
          error: !!error,
          action: undo ? actionLabel || 'Undo' : null,
        }))
      return [...kept, ...added]
    })
  }

  const leavingKey = shown
    .filter((t) => t.leaving)
    .map((t) => t.id)
    .join(',')
  useEffect(() => {
    if (!leavingKey) return
    const ids = leavingKey.split(',')
    const timer = setTimeout(
      () => setShown((prev) => prev.filter((t) => !ids.includes(String(t.id)))),
      EXIT_MS,
    )
    return () => clearTimeout(timer)
  }, [leavingKey])

  // Messages can wrap, so measure rather than assume a height.
  useLayoutEffect(() => {
    const el = stackRef.current
    if (!el) return
    const measure = () => setStackHeight(el.offsetHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const active = toasts.length > 0

  function handleAction(id) {
    toasts.find((t) => t.id === id)?.undo?.()
    onDismiss(id)
  }

  return (
    // The live region stays mounted so screen readers announce new
    // messages. While toasts show it also takes up the stack's room at the
    // end of the page, so the last row (or an expanded row's buttons) can
    // always be scrolled out from under them.
    <div
      role="status"
      aria-live="polite"
      className={active ? 'undo-toast-region active' : 'undo-toast-region'}
      style={active ? { '--toast-stack-height': `${stackHeight}px` } : undefined}
    >
      <div ref={stackRef} className="undo-toast-stack">
        {shown.map((toast) => {
          const classes = ['undo-toast']
          if (toast.error) classes.push('undo-toast-error')
          if (toast.leaving) classes.push('leaving')
          return (
            <div
              key={toast.id}
              className={classes.join(' ')}
              aria-hidden={toast.leaving || undefined}
            >
              <span className="undo-toast-message">{toast.message}</span>
              <button
                type="button"
                className="undo-toast-button"
                disabled={toast.leaving}
                onClick={() => (toast.action ? handleAction(toast.id) : onDismiss(toast.id))}
              >
                {toast.action || 'OK'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
