import { useEffect, useId, useRef, useState } from 'react'
import PhotoPicker from './PhotoPicker'
import PhotosField from './PhotosField'
import StoreChips from './StoreChips'
import Autocomplete from './Autocomplete'
import { categoryOptions, findCategory } from '../utils/items'
import { similarItems } from '../utils/search'
import { sortedIds, useDiscardGuard, useIsDirty } from '../hooks/useDiscardGuard'

// Modal for creating a catalog item (or, for an existing item that has no
// store yet, just picking its stores). Required fields come first and the
// optional ones follow, all visible, so nothing is hidden behind a toggle.
//
// onSave(details) resolves to an error message, or nothing on success.
// initialStoreIds preselects stores (e.g. the one being shopped); like the
// prefilled name, they're the starting point, not a change to discard.
export default function NewItemDialog({
  initialName,
  initialStoreIds = [],
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
  const hintId = useId()
  const [name, setName] = useState(existing?.name || initialName || '')
  const [selectedStores, setSelectedStores] = useState(() =>
    initialStoreIds.filter((id) => stores.some((s) => s.id === id)),
  )
  // whether the user has changed these yet: until then a missing value is
  // pointed out calmly rather than in error red
  const [nameEdited, setNameEdited] = useState(false)
  const [storesEdited, setStoresEdited] = useState(false)
  const [category, setCategory] = useState('')
  const [brandName, setBrandName] = useState('')
  const [photos, setPhotos] = useState([]) // of the item itself
  const [brandImageUrl, setBrandImageUrl] = useState('')
  const [selectionCriteria, setSelectionCriteria] = useState('')
  const [saving, setSaving] = useState(false)
  // two photo pickers can be uploading at once
  const [uploadsInFlight, setUploadsInFlight] = useState(0)
  const photoBusy = uploadsInFlight > 0
  const trackUpload = (busy) => setUploadsInFlight((n) => n + (busy ? 1 : -1))
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
  const missingName = !existing && !trimmedName
  const missingStores = selectedStores.length === 0
  const canSave = !missingName && !duplicate && !missingStores && !saving && !photoBusy

  const dirty = useIsDirty({
    name: trimmedName,
    stores: sortedIds(selectedStores),
    category: category.trim(),
    brandName: brandName.trim(),
    photos,
    brandImageUrl,
    selectionCriteria: selectionCriteria.trim(),
  })
  const { requestClose, discardPrompt } = useDiscardGuard({ dirty, busy: saving, onClose })

  // Save stays disabled until these are sorted, so each one says why right
  // under its field (and is read out with it)
  let nameHint = null
  if (missingName) {
    nameHint = (
      <span id={`${hintId}-name`} className={nameEdited ? 'field-hint' : 'field-note'}>
        Give the item a name to save.
      </span>
    )
  } else if (duplicate) {
    nameHint = (
      <span id={`${hintId}-name`} className="field-hint">
        Already in the catalog. Use another name to save.
      </span>
    )
  }
  let storesHint = null
  if (missingStores) {
    storesHint = (
      <span id={`${hintId}-stores`} className={storesEdited ? 'field-hint' : 'field-note'}>
        {stores.length ? 'Pick at least one store to save.' : 'No stores yet. Add one to save.'}
      </span>
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
      photos,
      brandImageUrl,
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
        if (e.target === dialogRef.current) requestClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current) requestClose()
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
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameEdited(true)
                }}
                aria-invalid={(duplicate || (missingName && nameEdited)) || undefined}
                aria-describedby={
                  [nameHint && `${hintId}-name`, similar.length > 0 && `${hintId}-similar`]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {nameHint}
              {similar.length > 0 && (
                <span id={`${hintId}-similar`} className="field-note">
                  Similar to {similar.map((i) => i.name).join(', ')}, already in the catalog.
                </span>
              )}
            </label>
          )}

          <StoreChips
            stores={stores}
            value={selectedStores}
            onChange={(ids) => {
              setSelectedStores(ids)
              setStoresEdited(true)
            }}
            onStoreAdded={onStoreAdded}
            describedBy={storesHint ? `${hintId}-stores` : undefined}
          >
            {storesHint}
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
              <div className="dialog-field">
                <span className="field-label">Photos</span>
                <PhotosField
                  photos={photos}
                  onChange={setPhotos}
                  onBusyChange={trackUpload}
                  itemName={trimmedName}
                />
                <span className="field-note">Of the item itself, whatever the brand.</span>
              </div>
              <label className="dialog-field">
                <span className="field-label">Preferred brand</span>
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              </label>
              <div className="dialog-field">
                <span className="field-label">Brand photo</span>
                <PhotoPicker
                  imageUrl={brandImageUrl}
                  onChange={setBrandImageUrl}
                  onBusyChange={trackUpload}
                  addLabel="Add a brand photo"
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
              {/* the photo is what's holding Save up, so say so where people look */}
              {photoBusy ? 'Uploading photo…' : saving ? 'Saving…' : submitLabel}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={requestClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
      {discardPrompt}
    </dialog>
  )
}
