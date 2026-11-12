import { useCallback, useEffect, useId, useRef } from 'react'
import ItemEditForm from './ItemEditForm'

// Modal (a bottom sheet on phones) around ItemEditForm. Takes the same
// props as the form, plus onClose for Escape, a backdrop tap or Cancel.
export default function ItemEditDialog({ onClose, ...formProps }) {
  const dialogRef = useRef(null)
  const busyRef = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    dialog?.querySelector('h2')?.focus()
  }, [])

  const handleBusyChange = useCallback((busy) => {
    busyRef.current = busy
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (e.target === dialogRef.current && !busyRef.current) onClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current && !busyRef.current) onClose()
      }}
    >
      <ItemEditForm
        {...formProps}
        titleId={titleId}
        onCancel={onClose}
        onBusyChange={handleBusyChange}
      />
    </dialog>
  )
}
