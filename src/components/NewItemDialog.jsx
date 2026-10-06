import { useEffect, useRef, useState } from 'react'
import PhotoPicker from './PhotoPicker'
import AddStoreInline from './AddStoreInline'

// Modal for creating a catalog item (or, for an existing item that has no
// store yet, just picking its stores). Required fields come first and the
// optional ones follow, all visible, so nothing is hidden behind a toggle.
//
// onSave(details) resolves to an error message, or nothing on success.
export default function NewItemDialog({
  initialName,
  existing,
  items,
  stores,
  onSave,
  onClose,
  onStoreAdded,
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
  const canSave = !!trimmedName && !duplicate && selectedStores.length > 0 && !saving && !photoBusy

  function toggleStore(storeId) {
    setSelectedStores((prev) =>
      prev.includes(storeId) ? prev.filter((s) => s !== storeId) : [...prev, storeId],
    )
  }

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
        if (!saving) onClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current && !saving) onClose()
      }}
    >
      <form className="item-dialog-form" onSubmit={handleSubmit}>
        <h2 id="item-dialog-title">
          {existing ? `Where can you get ${existing.name}?` : 'New item'}
        </h2>

        {!existing && (
          <label className="dialog-field">
            <span className="field-label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            {duplicate && <span className="field-hint">That item already exists.</span>}
          </label>
        )}

        <fieldset className="dialog-field">
          <legend className="field-label">Available at (pick at least one)</legend>
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
          {!stores.length && <span className="field-hint">No stores exist yet.</span>}
        </fieldset>

        {!existing && (
          <>
            <p className="dialog-section">Optional</p>
            <label className="dialog-field">
              <span className="field-label">Category</span>
              <input
                placeholder="e.g. produce, dairy"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
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

        {error && <p className="field-hint">{error}</p>}

        <div className="form-actions">
          <button type="submit" disabled={!canSave}>
            {saving ? 'Adding…' : 'Add to list'}
          </button>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  )
}
