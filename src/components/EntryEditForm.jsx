import { useState } from 'react'
import { supabase } from '../supabaseClient'

// Edits one list entry (how much, a note, who added it) in place, inside
// the list row's expanded panel, right under the item it belongs to.
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
    <form
      className="entry-form"
      aria-label={`Quantity and note for ${itemName}`}
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
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
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
