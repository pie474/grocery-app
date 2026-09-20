import { useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'

function makeBrandRow(brand) {
  return {
    key: brand?.id || crypto.randomUUID(),
    id: brand?.id,
    brand_name: brand?.brand_name || '',
    image_url: brand?.image_url || '',
    is_preferred: brand?.is_preferred || false,
  }
}

export default function ItemEditForm({ item, storeIds, brands, stores, onSaved, onCancel }) {
  const isNew = !item

  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || '')
  const [selectionCriteria, setSelectionCriteria] = useState(item?.selection_criteria || '')
  const [selectedStores, setSelectedStores] = useState(storeIds || [])
  const [brandRows, setBrandRows] = useState(
    brands?.length ? brands.map(makeBrandRow) : [makeBrandRow()],
  )
  const [saving, setSaving] = useState(false)

  function toggleStore(storeId) {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((s) => s !== storeId) : [...prev, storeId],
    )
  }

  function updateBrandRow(key, field, value) {
    setBrandRows((rows) =>
      rows.map((r) => {
        if (r.key !== key) return r
        // only one preferred brand at a time
        if (field === 'is_preferred' && value === true) {
          return { ...r, is_preferred: true }
        }
        return { ...r, [field]: value }
      }),
    )
    if (field === 'is_preferred' && value === true) {
      setBrandRows((rows) =>
        rows.map((r) => (r.key === key ? r : { ...r, is_preferred: false })),
      )
    }
  }

  function addBrandRow() {
    setBrandRows((rows) => [...rows, makeBrandRow()])
  }

  function removeBrandRow(key) {
    setBrandRows((rows) => rows.filter((r) => r.key !== key))
  }

  async function handleDeleteItem() {
    if (!item) return
    if (!confirm(`Delete "${item.name}" from the catalog? This also removes it from any current list.`)) {
      return
    }
    setSaving(true)
    await supabase.from('items').delete().eq('id', item.id)
    setSaving(false)
    onSaved()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    let itemId = item?.id

    if (isNew) {
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
    } else {
      await supabase
        .from('items')
        .update({
          name: name.trim(),
          category: category.trim() || 'uncategorized',
          selection_criteria: selectionCriteria.trim() || null,
        })
        .eq('id', itemId)
    }

    // Sync stores: replace the full set for this item.
    await supabase.from('item_stores').delete().eq('item_id', itemId)
    if (selectedStores.length) {
      await supabase
        .from('item_stores')
        .insert(selectedStores.map((store_id) => ({ item_id: itemId, store_id })))
    }

    // Sync brands: replace the full set for this item (simplest to reason
    // about, and brand lists are short).
    await supabase.from('item_brands').delete().eq('item_id', itemId)
    const brandsToInsert = brandRows
      .filter((r) => r.brand_name.trim())
      .map((r) => ({
        item_id: itemId,
        brand_name: r.brand_name.trim(),
        image_url: r.image_url.trim() || null,
        is_preferred: r.is_preferred,
      }))
    if (brandsToInsert.length) {
      await supabase.from('item_brands').insert(brandsToInsert)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <form className="item-edit-form" onSubmit={handleSubmit}>
      <input
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Category (e.g. produce, dairy)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <textarea
        placeholder="How to pick a good one (e.g. firm, deep green, slight give at the stem)"
        value={selectionCriteria}
        onChange={(e) => setSelectionCriteria(e.target.value)}
      />

      <p className="field-label">Available at</p>
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

      <p className="field-label">Brands</p>
      {brandRows.map((row) => (
        <div key={row.key} className="brand-row">
          <input
            placeholder="Brand name"
            value={row.brand_name}
            onChange={(e) => updateBrandRow(row.key, 'brand_name', e.target.value)}
          />
          <input
            placeholder="Image URL"
            value={row.image_url}
            onChange={(e) => updateBrandRow(row.key, 'image_url', e.target.value)}
          />
          <label className="preferred-toggle">
            <input
              type="radio"
              name="preferred-brand"
              checked={row.is_preferred}
              onChange={() => updateBrandRow(row.key, 'is_preferred', true)}
            />
            Preferred
          </label>
          <button
            type="button"
            className="icon-button"
            onClick={() => removeBrandRow(row.key)}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="link-button" onClick={addBrandRow}>
        + Add another brand
      </button>

      <div className="form-actions">
        <button type="submit" disabled={saving || !name.trim()}>
          {isNew ? 'Add item' : 'Save changes'}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        {!isNew && (
          <button
            type="button"
            className="danger-button"
            onClick={handleDeleteItem}
            disabled={saving}
          >
            Delete item
          </button>
        )}
      </div>
    </form>
  )
}
