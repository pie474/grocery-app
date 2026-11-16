import { useEffect, useId, useRef, useState } from 'react'
import ItemEditForm from './ItemEditForm'
import { useDiscardGuard } from '../hooks/useDiscardGuard'

// Modal (a bottom sheet on phones) around ItemEditForm. Takes the same
// props as the form, plus onClose for Escape, a backdrop tap or Cancel.
// The form reports whether it's saving (close attempts are ignored then)
// and whether anything changed (closing asks before discarding it).
export default function ItemEditDialog({ onClose, ...formProps }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const { requestClose, discardPrompt } = useDiscardGuard({ dirty, busy, onClose })

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    dialog?.querySelector('h2')?.focus()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (e.target === dialogRef.current) requestClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current) requestClose()
      }}
    >
      <ItemEditForm
        {...formProps}
        titleId={titleId}
        onCancel={requestClose}
        onBusyChange={setBusy}
        onDirtyChange={setDirty}
      />
      {discardPrompt}
    </dialog>
  )
}
