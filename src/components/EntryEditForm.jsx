import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function EntryEditForm({ entry, itemName, members = [], onSaved, onCancel }) {
  const [quantity, setQuantity] = useState(entry.quantity || '')
  const [note, setNote] = useState(entry.note || '')
  const [addedBy, setAddedBy] = useState(entry.added_by || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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
    <form className="entry-edit-form" onSubmit={handleSubmit}>
      <p className="field-label">Editing {itemName}</p>
      <div className="add-item-extra-row">
        <input
          className="quantity-input"
          placeholder="Qty (e.g. 2, 1 gal)"
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <input
          className="note-input"
          placeholder="Note (optional)"
          aria-label="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {members.length > 0 && (
          <select
            className="member-select"
            aria-label="Added by"
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
          >
            <option value="">Added by…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          Save
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
