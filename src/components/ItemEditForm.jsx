import { useState } from 'react'
import { supabase } from '../supabaseClient'
import PhotoPicker from './PhotoPicker'
import AddStoreInline from './AddStoreInline'
import Autocomplete from './Autocomplete'
import { categoryOptions, findCategory, resolveCategory } from '../utils/items'

function makeBrandRow(brand) {
  return {
    key: brand?.id || crypto.randomUUID(),
    id: brand?.id,
    brand_name: brand?.brand_name || '',
    image_url: brand?.image_url || '',
    is_preferred: brand?.is_preferred || false,
  }
}

// Edits an existing catalog item. New items are created in NewItemDialog.
export default function ItemEditForm({
  item,
  categories,
  storeIds,
  brands,
  stores,
  onSaved,
  onCancel,
  onStoreAdded,
}) {
  const [name, setName] = useState(item.name || '')
  const [category, setCategory] = useState(
    () => categories.find((c) => c.id === item.category_id)?.name || '',
  )
  const [selectionCriteria, setSelectionCriteria] = useState(item.selection_criteria || '')
  const [selectedStores, setSelectedStores] = useState(storeIds || [])
  const [brandRows, setBrandRows] = useState(
    brands?.length ? brands.map(makeBrandRow) : [makeBrandRow()],
  )
  const [saving, setSaving] = useState(false)
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const [error, setError] = useState(null)

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
    if (!confirm(`Delete "${item.name}" from the catalog? This also removes it from any current list.`)) {
      return
    }
    setSaving(true)
    setError(null)
    const { error: deleteError } = await supabase.from('items').delete().eq('id', item.id)
    setSaving(false)
    if (deleteError) {
      console.error(deleteError)
      setError("Couldn't delete the item. Check your connection and try again.")
      return
    }
    onSaved()
  }

  const missingStores = selectedStores.length === 0
  const newCategory = !!category.trim() && !findCategory(categories, category)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || missingStores) return
    setSaving(true)
    setError(null)

    const itemId = item.id

    const { categoryId, error: categoryError } = await resolveCategory(categories, category)
    if (categoryError) {
      setError(categoryError)
      setSaving(false)
      return
    }

    // Stops at the first failure so the form stays open with what was
    // typed; anything saved before that point stays saved.
    async function saveAll() {
      const { error: itemError } = await supabase
        .from('items')
        .update({
          name: name.trim(),
          category_id: categoryId,
          selection_criteria: selectionCriteria.trim() || null,
        })
        .eq('id', itemId)
      if (itemError) return itemError

      // Sync stores: replace the full set for this item.
      const { error: unlinkError } = await supabase
        .from('item_stores')
        .delete()
        .eq('item_id', itemId)
      if (unlinkError) return unlinkError
      if (selectedStores.length) {
        const { error: linkError } = await supabase
          .from('item_stores')
          .insert(selectedStores.map((store_id) => ({ item_id: itemId, store_id })))
        if (linkError) return linkError
      }

      // Sync brands: replace the full set for this item (simplest to reason
      // about, and brand lists are short).
      const { error: clearBrandsError } = await supabase
        .from('item_brands')
        .delete()
        .eq('item_id', itemId)
      if (clearBrandsError) return clearBrandsError
      // a row with a photo but no brand name is saved under the item's own
      // name, the same as in NewItemDialog
      const brandsToInsert = brandRows
        .filter((r) => r.brand_name.trim() || r.image_url)
        .map((r) => ({
          item_id: itemId,
          brand_name: r.brand_name.trim() || name.trim(),
          image_url: r.image_url.trim() || null,
          is_preferred: r.is_preferred,
        }))
      if (brandsToInsert.length) {
        const { error: brandsError } = await supabase.from('item_brands').insert(brandsToInsert)
        if (brandsError) return brandsError
      }
    }

    const saveError = await saveAll()
    if (saveError) {
      console.error(saveError)
      setError("Couldn't save all of your changes. Check your connection and try again.")
      setSaving(false)
      return
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
      <Autocomplete
        options={categoryOptions(categories)}
        value={category}
        onChange={setCategory}
        placeholder="Category (e.g. produce, dairy)"
      />
      {newCategory && <p className="field-note">New category</p>}
      <textarea
        placeholder="How to pick a good one (e.g. firm, deep green, slight give at the stem)"
        value={selectionCriteria}
        onChange={(e) => setSelectionCriteria(e.target.value)}
      />

      <p className="field-label">Available at (pick at least one)</p>
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
        <AddStoreInline
          stores={stores}
          onAdded={async (store) => {
            await onStoreAdded?.()
            setSelectedStores((prev) => [...prev, store.id])
          }}
        />
      </div>

      {missingStores && <p className="field-hint">Pick at least one store to save.</p>}

      <p className="field-label">Brands</p>
      {brandRows.map((row) => (
        <div key={row.key} className="brand-row">
          <input
            placeholder="Brand name"
            value={row.brand_name}
            onChange={(e) => updateBrandRow(row.key, 'brand_name', e.target.value)}
          />
          <PhotoPicker
            imageUrl={row.image_url}
            onChange={(url) => updateBrandRow(row.key, 'image_url', url)}
            onBusyChange={(busy) => setUploadsInFlight((n) => n + (busy ? 1 : -1))}
            removable
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

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button
          type="submit"
          disabled={saving || uploadsInFlight > 0 || !name.trim() || missingStores}
        >
          Save changes
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={handleDeleteItem}
          disabled={saving}
        >
          Delete item
        </button>
      </div>
    </form>
  )
}
