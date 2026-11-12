import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

// Modal (a bottom sheet on phones) for editing one list entry: how much,
// a note, and who added it. onClose is for Escape, a backdrop tap or Cancel.
export default function EntryEditDialog({ entry, itemName, members = [], onSaved, onClose }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const [quantity, setQuantity] = useState(entry.quantity || '')
  const [note, setNote] = useState(entry.note || '')
  const [addedBy, setAddedBy] = useState(entry.added_by || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // focus goes to the quantity field (autoFocus), which is what people
    // open this to change
    dialogRef.current?.showModal()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('list_entries')
      .update({
        quantity: quantity.trim() || null,
        note: note.trim() || null,
        added_by: addedBy || null,
      })
      .eq('id', entry.id)
    setSaving(false)
    if (error) {
      console.error(error)
      setError("Couldn't save changes. Try again.")
      return
    }
    onSaved()
  }

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!saving) onClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current && !saving) onClose()
      }}
    >
      <form className="item-dialog-form" onSubmit={handleSubmit}>
        <div className="dialog-header">
          <h2 id={titleId}>{itemName || 'Item'}</h2>
        </div>

        <div className="dialog-body">
          <div className="entry-form-fields">
            <label className="dialog-field entry-form-quantity">
              <span className="field-label">Quantity</span>
              <input
                autoFocus
                placeholder="e.g. 2, 1 gal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            {members.length > 0 && (
              <label className="dialog-field entry-form-member">
                <span className="field-label">Added by</span>
                <select value={addedBy} onChange={(e) => setAddedBy(e.target.value)}>
                  <option value="">No one</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="dialog-field entry-form-note">
              <span className="field-label">Note</span>
              <input
                placeholder="e.g. ripe ones for tonight"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="dialog-footer">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
