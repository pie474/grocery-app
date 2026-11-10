import { useEffect, useRef, useState } from 'react'
import PhotoPicker from './PhotoPicker'
import StoreChips from './StoreChips'
import Autocomplete from './Autocomplete'
import { categoryOptions, findCategory } from '../utils/items'
import { similarItems } from '../utils/search'

// Modal for creating a catalog item (or, for an existing item that has no
// store yet, just picking its stores). Required fields come first and the
// optional ones follow, all visible, so nothing is hidden behind a toggle.
//
// onSave(details) resolves to an error message, or nothing on success.
export default function NewItemDialog({
  initialName,
  existing,
  items,
  categories,
  stores,
  onSave,
  onClose,
  onStoreAdded,
  submitLabel = 'Add to list',
}) {
  const dialogRef = useRef(null)
  const [name, setName] = useState(existing?.name || initialName)
  const [selectedStores, setSelectedStores] = useState([])
  const [category, setCategory] = useState('')
  const [brandName, setBrandName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [selectionCriteria, setSelectionCriteria] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const trimmedName = name.trim()
  const duplicate =
    !existing && items.some((i) => i.name.toLowerCase() === trimmedName.toLowerCase())
  // same thing under another spelling? (a hint only; it may really be new)
  const similar = !existing && !duplicate ? similarItems(items, trimmedName) : []
  const newCategory = !!category.trim() && !findCategory(categories, category)
  const canSave = !!trimmedName && !duplicate && selectedStores.length > 0 && !saving && !photoBusy

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    const message = await onSave({
      name: trimmedName,
      stores: selectedStores,
      category,
      brandName,
      imageUrl,
      selectionCriteria,
    })
    if (message) {
      setError(message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog"
      aria-labelledby="item-dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        if (e.target === dialogRef.current && !saving) onClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current && !saving) onClose()
      }}
    >
      <form className="item-dialog-form" onSubmit={handleSubmit}>
        <div className="dialog-header">
          <h2 id="item-dialog-title">
            {existing ? `Where can you get ${existing.name}?` : 'New item'}
          </h2>
        </div>

        <div className="dialog-body">
          {!existing && (
            <label className="dialog-field">
              <span className="field-label">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
              {duplicate && <span className="field-hint">That item already exists.</span>}
              {similar.length > 0 && (
                <span className="field-note">
                  Similar to {similar.map((i) => i.name).join(', ')}, already in the catalog.
                </span>
              )}
            </label>
          )}

          <StoreChips
            stores={stores}
            value={selectedStores}
            onChange={setSelectedStores}
            onStoreAdded={onStoreAdded}
          >
            {!stores.length && <span className="field-hint">No stores exist yet.</span>}
          </StoreChips>

          {!existing && (
            <>
              <p className="dialog-section">Optional</p>
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
              <label className="dialog-field">
                <span className="field-label">Preferred brand</span>
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              </label>
              <div className="dialog-field">
                <span className="field-label">Photo</span>
                <PhotoPicker
                  imageUrl={imageUrl}
                  onChange={setImageUrl}
                  onBusyChange={setPhotoBusy}
                  addLabel="Add a photo"
                  removable
                />
              </div>
              <label className="dialog-field">
                <span className="field-label">How to pick a good one</span>
                <textarea
                  placeholder="e.g. firm, deep green, slight give at the stem"
                  value={selectionCriteria}
                  onChange={(e) => setSelectionCriteria(e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <div className="dialog-footer">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="submit" disabled={!canSave}>
              {saving ? 'Saving…' : submitLabel}
            </button>
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
