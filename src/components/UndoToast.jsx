export default function UndoToast({ message, onUndo, onDismiss }) {
  if (!message) return null

  return (
    <div className="undo-toast">
      <span>{message}</span>
      <button
        type="button"
        className="undo-toast-button"
        onClick={() => {
          onUndo()
          onDismiss()
        }}
      >
        Undo
      </button>
    </div>
  )
}
