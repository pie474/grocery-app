import { useEffect, useState } from 'react'

// matches --duration in tokens.css: how long the exit animation runs
const EXIT_MS = 200

// Bottom toast. Shows an Undo button when onUndo is given, otherwise a
// plain dismiss; `error` styles it as a failure message. `id` changes for
// every new toast, so a replacement restarts the entrance animation.
export default function UndoToast({ id, message, error = false, onUndo, onDismiss }) {
  // the toast on screen; kept for a moment after it's dismissed so it can
  // animate out instead of vanishing
  const [shown, setShown] = useState(null)
  const leaving = !message && !!shown

  if (message && shown?.id !== id) {
    setShown({ id, message, error, hasUndo: !!onUndo })
  }

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setShown(null), EXIT_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const classes = ['undo-toast']
  if (shown?.error) classes.push('undo-toast-error')
  if (leaving) classes.push('leaving')

  return (
    // the live region stays mounted so screen readers announce new messages;
    // while a toast shows it also takes up room at the end of the page, so
    // the last row can be scrolled clear of it
    <div role="status" aria-live="polite" className={shown ? 'undo-toast-region active' : 'undo-toast-region'}>
      {shown && (
        <div key={shown.id} className={classes.join(' ')} aria-hidden={leaving || undefined}>
          <span>{shown.message}</span>
          <button
            type="button"
            className="undo-toast-button"
            disabled={leaving}
            onClick={() => {
              onUndo?.()
              onDismiss()
            }}
          >
            {shown.hasUndo ? 'Undo' : 'OK'}
          </button>
        </div>
      )}
    </div>
  )
}
