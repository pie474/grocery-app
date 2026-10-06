import { useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'
import ItemAutocomplete from './ItemAutocomplete'
import NewItemDialog from './NewItemDialog'
import { formatRelativeTime } from '../utils/time'

const LAST_MEMBER_KEY = 'grocery-app:last-member-id'

export default function AddItemForm({
  items,
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
    await addToList(existing.id)
    setSaving(false)
  }

  // Called by the dialog; returns an error message, or nothing on success.
  async function handleCreate(details) {
    let itemId = existing?.id

    if (!itemId) {
      const { data: newItem, error } = await supabase
        .from('items')
        .insert({
          household_id: HOUSEHOLD_ID,
          name: details.name,
          category: details.category.trim() || 'uncategorized',
          selection_criteria: details.selectionCriteria.trim() || null,
        })
        .select()
        .single()
      if (error) {
        console.error(error)
        return "Couldn't create the item. Try again."
      }
      itemId = newItem.id

      if (details.brandName.trim()) {
        await supabase.from('item_brands').insert({
          item_id: itemId,
          brand_name: details.brandName.trim(),
          image_url: details.imageUrl.trim() || null,
          is_preferred: true,
        })
      }
    }

    const { error: storesError } = await supabase
      .from('item_stores')
      .insert(details.stores.map((store_id) => ({ item_id: itemId, store_id })))
    if (storesError) {
      console.error(storesError)
      return "Couldn't save the stores. Try again."
    }

    if (!(await addToList(itemId))) return "Couldn't add it to the list. Try again."
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
          <ItemAutocomplete
            items={items}
            value={name}
            onChange={setName}
            placeholder="Add an item…"
          />
          <button type="submit" disabled={saving || !name.trim()}>
            Add
          </button>
        </div>

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
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <input
            className="note-input"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {members.length > 0 && (
            <select
              className="member-select"
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
          stores={stores}
          onSave={handleCreate}
          onStoreAdded={onStoreAdded}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  )
}
