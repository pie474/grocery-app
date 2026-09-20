import { useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'

export default function AddItemForm({ items, stores, onAdded }) {
  const [name, setName] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [category, setCategory] = useState('')
  const [selectedStores, setSelectedStores] = useState([])
  const [brandName, setBrandName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectionCriteria, setSelectionCriteria] = useState('')
  const [saving, setSaving] = useState(false)

  const existing = items.find(
    (i) => i.name.toLowerCase() === name.trim().toLowerCase(),
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    let itemId = existing?.id

    if (!itemId) {
      // brand-new catalog item
      const { data: newItem, error } = await supabase
        .from('items')
        .insert({
          household_id: HOUSEHOLD_ID,
          name: name.trim(),
          category: category.trim() || 'uncategorized',
          selection_criteria: selectionCriteria.trim() || null,
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        setSaving(false)
        return
      }
      itemId = newItem.id

      if (selectedStores.length) {
        await supabase
          .from('item_stores')
          .insert(selectedStores.map((store_id) => ({ item_id: itemId, store_id })))
      }

      if (brandName.trim()) {
        await supabase.from('item_brands').insert({
          item_id: itemId,
          brand_name: brandName.trim(),
          image_url: imageUrl.trim() || null,
          is_preferred: true,
        })
      }
    }

    // add it to the live shared list either way
    await supabase.from('list_entries').insert({
      household_id: HOUSEHOLD_ID,
      item_id: itemId,
      status: 'needed',
    })

    setName('')
    setCategory('')
    setSelectedStores([])
    setBrandName('')
    setImageUrl('')
    setSelectionCriteria('')
    setShowDetails(false)
    setSaving(false)
    onAdded?.()
  }

  function toggleStore(storeId) {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((s) => s !== storeId) : [...prev, storeId],
    )
  }

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <div className="add-item-row">
        <input
          list="known-items"
          placeholder="Add an item…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <datalist id="known-items">
          {items.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
        <button type="submit" disabled={saving || !name.trim()}>
          Add
        </button>
      </div>

      {!existing && name.trim() && (
        <button
          type="button"
          className="link-button"
          onClick={() => setShowDetails((s) => !s)}
        >
          {showDetails ? 'Hide details' : 'New item — add details?'}
        </button>
      )}

      {showDetails && !existing && (
        <div className="add-item-details">
          <input
            placeholder="Category (e.g. produce, dairy)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div className="store-checkboxes">
            {stores.map((store) => (
              <label key={store.id} className="store-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStores.includes(store.id)}
                  onChange={() => toggleStore(store.id)}
                />
                {store.name}
              </label>
            ))}
          </div>

          <input
            placeholder="Preferred brand"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
          <input
            placeholder="Brand image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <textarea
            placeholder="How to pick a good one (e.g. firm, deep green, slight give at the stem)"
            value={selectionCriteria}
            onChange={(e) => setSelectionCriteria(e.target.value)}
          />
        </div>
      )}
    </form>
  )
}
