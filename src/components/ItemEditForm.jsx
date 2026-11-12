import { useEffect, useId, useState } from 'react'
import { supabase } from '../supabaseClient'
import PhotoPicker from './PhotoPicker'
import StoreChips from './StoreChips'
import Autocomplete from './Autocomplete'
import ConfirmDialog from './ConfirmDialog'
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
// Rendered inside ItemEditDialog: a heading, a scrolling body, and a
// footer with Save / Cancel that stays in reach. Deleting the item lives
// at the very bottom of the body, well away from Save.
export default function ItemEditForm({
  titleId,
  item,
  categories,
  storeIds,
  brands,
  stores,
  onSaved,
  onCancel,
  onStoreAdded,
  onBusyChange,
}) {
  const fieldId = useId()
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
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // the dialog around this form ignores Escape and backdrop taps mid-save
  useEffect(() => {
    onBusyChange?.(saving)
  }, [saving, onBusyChange])

  function updateBrandRow(key, field, value) {
    setBrandRows((rows) =>
      rows.map((r) => {
        if (r.key === key) return { ...r, [field]: value }
        // only one preferred brand at a time
        if (field === 'is_preferred' && value === true) return { ...r, is_preferred: false }
        return r
      }),
    )
  }

  function addBrandRow() {
    setBrandRows((rows) => [...rows, makeBrandRow()])
  }

  function removeBrandRow(key) {
    setBrandRows((rows) => rows.filter((r) => r.key !== key))
  }

  async function handleDeleteItem() {
    setSaving(true)
    setError(null)
    const { error: deleteError } = await supabase.from('items').delete().eq('id', item.id)
    setSaving(false)
    setConfirmingDelete(false)
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
    <form className="item-dialog-form" onSubmit={handleSubmit}>
      <div className="dialog-header">
        {/* focused on open instead of the first field, so the keyboard
            doesn't cover the form before anyone has chosen what to edit */}
        <h2 id={titleId} tabIndex={-1}>
          Edit item
        </h2>
      </div>

      <div className="dialog-body">
        <label className="dialog-field">
          <span className="field-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          {!name.trim() && <span className="field-hint">Give the item a name to save.</span>}
        </label>

        <label className="dialog-field">
          <span className="field-label">Category</span>
          <Autocomplete
            options={categoryOptions(categories)}
            value={category}
            onChange={setCategory}
            placeholder="e.g. produce, dairy"
          />
          {newCategory && <span className="field-note">New category</span>}
        </label>

        <StoreChips
          stores={stores}
          value={selectedStores}
          onChange={setSelectedStores}
          onStoreAdded={onStoreAdded}
        >
          {missingStores && <span className="field-hint">Pick at least one store to save.</span>}
        </StoreChips>

        <label className="dialog-field">
          <span className="field-label">How to pick a good one</span>
          <textarea
            placeholder="e.g. firm, deep green, slight give at the stem"
            value={selectionCriteria}
            onChange={(e) => setSelectionCriteria(e.target.value)}
          />
        </label>

        <fieldset className="dialog-field">
          <legend className="field-label">Brands</legend>
          {brandRows.length > 0 && (
            <ul className="brand-cards">
              {brandRows.map((row, index) => (
                <li key={row.key} className="brand-card">
                  <input
                    aria-label={`Brand ${index + 1} name`}
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
                  <div className="brand-card-footer">
                    <label className="preferred-toggle">
                      <input
                        type="radio"
                        name={`${fieldId}-preferred`}
                        checked={row.is_preferred}
                        onChange={() => updateBrandRow(row.key, 'is_preferred', true)}
                      />
                      Preferred
                    </label>
                    <button
                      type="button"
                      className="quiet-button"
                      aria-label={`Remove brand ${row.brand_name.trim() || index + 1}`}
                      onClick={() => removeBrandRow(row.key)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="add-row-button" onClick={addBrandRow}>
            + Add a brand
          </button>
        </fieldset>

        <div className="dialog-danger-zone">
          <button
            type="button"
            className="quiet-button danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={saving}
          >
            Delete item from catalog
          </button>
        </div>
      </div>

      <div className="dialog-footer">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            disabled={saving || uploadsInFlight > 0 || !name.trim() || missingStores}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete "${item.name}"?`}
          message="It's removed from the catalog and from the current list. This can't be undone."
          confirmLabel="Delete item"
          danger
          busy={saving}
          onConfirm={handleDeleteItem}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </form>
  )
}
