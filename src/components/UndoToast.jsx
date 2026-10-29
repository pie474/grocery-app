// Bottom toast. Shows an Undo button when onUndo is given, otherwise a
// plain dismiss; `error` styles it as a failure message.
export default function UndoToast({ message, error = false, onUndo, onDismiss }) {
  return (
    // the live region stays mounted so screen readers announce new messages
    <div role="status" aria-live="polite">
      {message && (
        <div className={error ? 'undo-toast undo-toast-error' : 'undo-toast'}>
          <span>{message}</span>
          <button
            type="button"
            className="undo-toast-button"
            onClick={() => {
              onUndo?.()
              onDismiss()
            }}
          >
            {onUndo ? 'Undo' : 'OK'}
          </button>
        </div>
      )}
    </div>
  )
}
