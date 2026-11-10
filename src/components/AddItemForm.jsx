import { useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'
import Autocomplete from './Autocomplete'
import NewItemDialog from './NewItemDialog'
import { createItem, linkStores } from '../utils/items'
import { formatRelativeTime } from '../utils/time'
import { similarItems } from '../utils/search'

export default function AddItemForm({
  items,
  categories,
  stores,
  itemStores = [],
  entries = [],
  addedBy = null,
  onAdded,
  onStoreAdded,
}) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // existing items the typed name may be another spelling of, shown as a
  // "did you mean" before creating a new item; null when not asking
  const [suggestions, setSuggestions] = useState(null)

  const existing = items.find(
    (i) => i.name.toLowerCase() === name.trim().toLowerCase(),
  )

  // Every item needs at least one store, so the list can be filtered by
  // store. New items, and existing ones with no store linked, go through
  // the dialog; everything else is added straight to the list.
  const hasStores = (item) => itemStores.some((link) => link.item_id === item.id)

  // entries still waiting on the list, to warn before adding a duplicate
  const neededEntries = entries.filter((e) => e.status === 'needed')
  const onList = !!existing && neededEntries.find((e) => e.item_id === existing.id)

  // Quantity and note only matter once there's something to
  // add, so they stay out of the way of the list until then.
  const showExtras = !!(name.trim() || quantity || note)

  async function addToList(itemId) {
    const { error } = await supabase.from('list_entries').insert({
      household_id: HOUSEHOLD_ID,
      item_id: itemId,
      status: 'needed',
      quantity: quantity.trim() || null,
      note: note.trim() || null,
      added_by: addedBy,
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

  // Adds `item` (an existing catalog item, or null for a new one) to the list.
  async function proceed(item) {
    if (!item || !hasStores(item)) {
      setDialogOpen(true)
      return
    }
    setSaving(true)
    if (!(await addToList(item.id))) {
      setError(`Couldn't add "${item.name}". Check your connection and try again.`)
    }
    setSaving(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // nothing typed yet: point at the field rather than adding a blank
    if (!name.trim()) {
      e.currentTarget.querySelector('input')?.focus()
      return
    }
    if (!existing) {
      const similar = similarItems(items, name)
      if (similar.length) {
        setSuggestions(similar)
        return
      }
    }
    await proceed(existing)
  }

  async function pickSuggestion(item) {
    setSuggestions(null)
    setName(item.name)
    // already on the list: stop at the name so the "Already on the list"
    // note shows and adding it again stays a deliberate second tap
    if (neededEntries.some((e) => e.item_id === item.id)) return
    await proceed(item)
  }

  function addAsNew() {
    setSuggestions(null)
    setDialogOpen(true)
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
              setSuggestions(null)
            }}
            placeholder="Add an item…"
            ariaLabel="Item name"
            renderMeta={(item) => {
              if (neededEntries.some((e) => e.item_id === item.id)) return 'on the list'
              return item.last_bought_at
                ? `bought ${formatRelativeTime(item.last_bought_at)}`
                : 'never bought'
            }}
          />
          {/* stays enabled while empty, so it doesn't look broken before
              anything is typed; submitting empty just focuses the field */}
          <button type="submit" className="add-item-submit" disabled={saving}>
            {onList ? 'Add again' : 'Add'}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {suggestions && (
          <div className="inline-notice did-you-mean" role="status">
            <p className="inline-notice-title">Did you mean</p>
            <div className="suggestion-chips">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="suggestion-button"
                  disabled={saving}
                  onClick={() => pickSuggestion(item)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <button type="button" className="link-button" disabled={saving} onClick={addAsNew}>
              No, add "{name.trim()}" as a new item
            </button>
          </div>
        )}

        {onList && (
          <p className="inline-notice inline-notice-warning">
            Already on the list{onList.quantity && ` (${onList.quantity})`}
          </p>
        )}
        {existing && !onList && (
          <p className="inline-notice">
            {existing.last_bought_at
              ? `Last bought ${formatRelativeTime(existing.last_bought_at)}`
              : 'Not bought yet'}
          </p>
        )}

        {showExtras && (
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
          </div>
        )}
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
