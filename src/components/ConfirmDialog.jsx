import { useEffect, useId, useRef } from 'react'

// In-app replacement for window.confirm(): a small modal with a title, a
// message, and confirm / cancel buttons. Render it only while it should
// show; it opens itself on mount. Safe to render inside another <dialog>
// (it stacks on top, and its Escape and clicks don't reach the parent).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const id = useId()

  useEffect(() => {
    dialogRef.current?.showModal()
    // start on the safe choice, so a stray Enter doesn't delete anything
    cancelRef.current?.focus()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={message ? `${id}-message` : undefined}
      onCancel={(e) => {
        e.preventDefault()
        // React passes dialog events up to any parent <dialog> as well
        e.stopPropagation()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        e.stopPropagation()
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current && !busy) onCancel()
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      {message && <p id={`${id}-message`}>{message}</p>}
      <div className="confirm-dialog-actions">
        <button
          ref={cancelRef}
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'confirm-danger' : undefined}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
