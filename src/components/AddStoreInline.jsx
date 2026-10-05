import { useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'

// "+ Store" button that expands into a small inline form. Calls
// onAdded(store) with the new row once it has been saved.
export default function AddStoreInline({ stores, onAdded }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function close() {
    setOpen(false)
    setName('')
    setError(null)
  }

  async function save() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    if (stores.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists.`)
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('stores')
      .insert({ household_id: HOUSEHOLD_ID, name: trimmed })
      .select()
      .single()
    setSaving(false)
    if (insertError) {
      console.error(insertError)
      setError("Couldn't add the store. Try again.")
      return
    }
    close()
    await onAdded?.(data)
  }

  if (!open) {
    return (
      <button type="button" className="add-store-button" onClick={() => setOpen(true)}>
        + Store
      </button>
    )
  }

  // Not a <form>: this renders inside other forms, and nested forms are invalid.
  return (
    <div className="add-store-inline">
      <input
        autoFocus
        placeholder="Store name"
        aria-label="New store name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          } else if (e.key === 'Escape') {
            close()
          }
        }}
      />
      <button type="button" onClick={save} disabled={saving || !name.trim()}>
        Add
      </button>
      <button type="button" className="secondary-button" onClick={close}>
        Cancel
      </button>
      {error && <p className="field-hint add-store-error">{error}</p>}
    </div>
  )
}
