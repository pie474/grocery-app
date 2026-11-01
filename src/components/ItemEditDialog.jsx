import { useEffect, useRef } from 'react'
import ItemEditForm from './ItemEditForm'

// ItemEditForm in a sheet, so editing an item from the list gets the
// full width instead of being squeezed into the row's panel.
export default function ItemEditDialog({ item, onSaved, onClose, ...formProps }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog sheet"
      aria-labelledby="item-edit-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="item-dialog-form">
        <h2 id="item-edit-title">Edit {item.name}</h2>
        <ItemEditForm item={item} onSaved={onSaved} onCancel={onClose} {...formProps} />
      </div>
    </dialog>
  )
}
