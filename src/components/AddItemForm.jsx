import { useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'
import Autocomplete from './Autocomplete'
import NewItemDialog from './NewItemDialog'
import { createItem, linkStores } from '../utils/items'
import { formatRelativeTime } from '../utils/time'

const LAST_MEMBER_KEY = 'grocery-app:last-member-id'

export default function AddItemForm({
  items,
  categories,
  stores,
  itemStores = [],
  members = [],
  onAdded,
  onStoreAdded,
}) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [addedBy, setAddedBy] = useState(
    () => localStorage.getItem(LAST_MEMBER_KEY) || '',
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const existing = items.find(
    (i) => i.name.toLowerCase() === name.trim().toLowerCase(),
  )

  // Every item needs at least one store, so the list can be filtered by
  // store. New items, and existing ones with no store linked, go through
  // the dialog; everything else is added straight to the list.
  const existingHasStores =
    !!existing && itemStores.some((link) => link.item_id === existing.id)

  async function addToList(itemId) {
    const { error } = await supabase.from('list_entries').insert({
      household_id: HOUSEHOLD_ID,
      item_id: itemId,
      status: 'needed',
      quantity: quantity.trim() || null,
      note: note.trim() || null,
      added_by: addedBy || null,
    })
    if (error) {
      console.error(error)
      return false
    }
    setError(null)
    setName('')
    setQuantity('')
    setNote('')
    onAdded?.()
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (!existingHasStores) {
      setDialogOpen(true)
      return
    }
    setSaving(true)
    if (!(await addToList(existing.id))) {
      setError(`Couldn't add "${existing.name}". Check your connection and try again.`)
    }
    setSaving(false)
  }

  // Called by the dialog; returns an error message, or nothing on success.
  async function handleCreate(details) {
    const result = existing
      ? await linkStores(existing.id, details.stores)
      : await createItem(details, categories)
    if (result.error) return result.error
    if (!(await addToList(result.itemId))) return "Couldn't add it to the list. Try again."
    setDialogOpen(false)
  }

  function handleAddedByChange(memberId) {
    setAddedBy(memberId)
    if (memberId) {
      localStorage.setItem(LAST_MEMBER_KEY, memberId)
    } else {
      localStorage.removeItem(LAST_MEMBER_KEY)
    }
  }

  return (
    <>
      <form className="add-item-form" onSubmit={handleSubmit}>
        <div className="add-item-row">
          <Autocomplete
            options={items}
            value={name}
            onChange={(value) => {
              setName(value)
              setError(null)
            }}
            placeholder="Add an item…"
            ariaLabel="Item name"
            renderMeta={(item) =>
              item.last_bought_at
                ? `bought ${formatRelativeTime(item.last_bought_at)}`
                : 'never bought'
            }
          />
          <button type="submit" disabled={saving || !name.trim()}>
            Add
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {existing && (
          <p className="last-bought">
            {existing.last_bought_at
              ? `Last bought ${formatRelativeTime(existing.last_bought_at)}`
              : 'Not bought yet'}
          </p>
        )}

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
              aria-label="Who's adding"
              value={addedBy}
              onChange={(e) => handleAddedByChange(e.target.value)}
            >
              <option value="">Who's adding?</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>

      {/* outside the form above: forms can't nest */}
      {dialogOpen && (
        <NewItemDialog
          initialName={name.trim()}
          existing={existing}
          items={items}
          categories={categories}
          stores={stores}
          onSave={handleCreate}
          onStoreAdded={onStoreAdded}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  )
}
