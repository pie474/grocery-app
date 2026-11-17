import { useEffect, useId, useRef, useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'
import ActionMenu from './ActionMenu'
import ConfirmDialog from './ConfirmDialog'

function itemCountLabel(count) {
  return count === 1 ? '1 item' : `${count} items`
}

// What a rename gets when the database has no UPDATE policy on stores yet
// (set up before migrations/004_stores_update.sql). With row level
// security on and no policy, Postgres doesn't raise an error: the update
// just matches no rows. Some setups do refuse outright (42501).
const UPDATE_NOT_ALLOWED =
  "Renaming stores isn't set up on this database yet. Whoever manages the app can run migrations/004_stores_update.sql to turn it on."

function sameName(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

// One store: read-only (name, how many catalog items it sells, a "⋮"
// menu) until someone picks Rename from the menu.
function StoreRow({ store, others, count, onlyHereCount, onChanged, onDeleted }) {
  const [renaming, setRenaming] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [name, setName] = useState(store.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // a setup problem rather than a typo, so it's boxed like one
  const [notice, setNotice] = useState(null)

  const trimmed = name.trim()

  function startRenaming() {
    setName(store.name)
    setError(null)
    setNotice(null)
    setRenaming(true)
  }

  // the error and any setup notice belong to this attempt; they go with it
  function stopRenaming() {
    setError(null)
    setNotice(null)
    setRenaming(false)
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!trimmed || trimmed === store.name) {
      setRenaming(false)
      return
    }
    const clash = others.find((s) => sameName(s.name, trimmed))
    if (clash) {
      setError(`"${clash.name}" already exists.`)
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const { data, error: updateError } = await supabase
      .from('stores')
      .update({ name: trimmed })
      .eq('id', store.id)
      .select()
    setBusy(false)
    if (updateError || !data?.length) {
      if (updateError) console.error(updateError)
      if (!updateError || updateError.code === '42501') setNotice(UPDATE_NOT_ALLOWED)
      else setError("Couldn't rename it. Check your connection and try again.")
      return
    }
    setRenaming(false)
    onChanged()
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    // item_stores rows go with it (on delete cascade); the items stay
    const { error: deleteError } = await supabase.from('stores').delete().eq('id', store.id)
    setBusy(false)
    setConfirmingDelete(false)
    if (deleteError) {
      console.error(deleteError)
      setError("Couldn't delete it. Check your connection and try again.")
      return
    }
    onDeleted(store)
  }

  // what deleting does to the catalog, said plainly before it happens
  function deleteMessage() {
    if (!count) return 'No items are linked to it.'
    const sold = `${itemCountLabel(count)} ${count === 1 ? 'is' : 'are'} sold there.`
    const stay = count === 1 ? 'It stays in the catalog' : 'They stay in the catalog'
    if (!onlyHereCount)
      return `${sold} ${stay}, still sold at ${count === 1 ? 'its' : 'their'} other stores.`
    if (onlyHereCount === count) return `${sold} ${stay}, with no store until you pick one.`
    return `${sold} ${stay}; ${onlyHereCount} of them will have no store until you pick one.`
  }

  const menuItems = [
    { label: 'Rename', onSelect: startRenaming },
    { label: 'Delete', danger: true, onSelect: () => setConfirmingDelete(true) },
  ]

  return (
    <li className="category-row">
      {!renaming && (
        <div className="category-row-view">
          <span className="category-row-text">
            <span className="category-name">{store.name}</span>
            <span className="category-count">{itemCountLabel(count)}</span>
          </span>
          <ActionMenu label={`More actions for ${store.name}`} items={menuItems} disabled={busy} />
        </div>
      )}

      {renaming && (
        <form className="category-row-edit" onSubmit={handleRename}>
          <input
            autoFocus
            aria-label={`New name for ${store.name}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault() // close the rename, not the whole dialog
                stopRenaming()
              }
            }}
            disabled={busy}
          />
          <div className="category-row-edit-actions">
            <button type="submit" disabled={busy || !trimmed}>
              Save
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={stopRenaming}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="field-hint" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="dialog-notice store-row-notice" role="alert">
          {notice}
        </p>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${store.name}?`}
          message={deleteMessage()}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  )
}

// Modal for adding, renaming and deleting stores, opened from the end of
// the store pills. Deleting a store unlinks its items (item_stores rows
// cascade) but keeps the items themselves in the catalog.
export default function StoreManager({ stores, itemStores, onChanged, onDeleted, onClose }) {
  const dialogRef = useRef(null)
  const doneRef = useRef(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const addId = useId()

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal focuses the first control; start on Done instead
    doneRef.current?.focus()
  }, [])

  // catalog items per store, and how many stores each item is sold at
  const counts = {}
  const storesPerItem = {}
  for (const link of itemStores) {
    if (!stores.some((s) => s.id === link.store_id)) continue
    counts[link.store_id] = (counts[link.store_id] || 0) + 1
    storesPerItem[link.item_id] = (storesPerItem[link.item_id] || 0) + 1
  }
  // items that only this store sells, which deleting it leaves storeless
  function onlyHere(storeId) {
    return itemStores.filter(
      (link) => link.store_id === storeId && storesPerItem[link.item_id] === 1,
    ).length
  }

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed || adding) return
    const clash = stores.find((s) => sameName(s.name, trimmed))
    if (clash) {
      setAddError(`"${clash.name}" already exists.`)
      return
    }
    setAdding(true)
    setAddError(null)
    const { error } = await supabase
      .from('stores')
      .insert({ household_id: HOUSEHOLD_ID, name: trimmed })
    setAdding(false)
    if (error) {
      console.error(error)
      setAddError("Couldn't add the store. Check your connection and try again.")
      return
    }
    setNewName('')
    setAnnouncement(`Added ${trimmed}.`)
    onChanged()
  }

  function handleDeleted(store) {
    setAnnouncement(`Deleted ${store.name}.`)
    // the row is gone; don't leave focus on nothing
    doneRef.current?.focus()
    onDeleted(store)
  }

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog"
      aria-labelledby="store-manager-title"
      onCancel={(e) => {
        e.preventDefault()
        if (e.target === dialogRef.current) onClose()
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="item-dialog-form">
        <div className="dialog-header">
          <h2 id="store-manager-title">Stores</h2>
          <p className="field-note">The list can be filtered to what each store sells.</p>
        </div>

        <div className="dialog-body category-manager">
          {stores.length ? (
            <ul className="category-rows">
              {stores.map((store) => (
                <StoreRow
                  key={store.id}
                  store={store}
                  others={stores.filter((s) => s.id !== store.id)}
                  count={counts[store.id] || 0}
                  onlyHereCount={onlyHere(store.id)}
                  onChanged={onChanged}
                  onDeleted={handleDeleted}
                />
              ))}
            </ul>
          ) : (
            <p className="field-note">No stores yet. Add the places you shop below.</p>
          )}

          <form className="store-manager-add" onSubmit={handleAdd}>
            <div className="dialog-field">
              <label className="field-label" htmlFor={addId}>
                Add a store
              </label>
              <span className="store-manager-add-row">
                <input
                  id={addId}
                  placeholder="Store name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setAddError(null)
                  }}
                  disabled={adding}
                />
                <button type="submit" disabled={adding || !newName.trim()}>
                  Add
                </button>
              </span>
            </div>
            {addError && (
              <p className="field-hint" role="alert">
                {addError}
              </p>
            )}
          </form>

          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </div>

        <div className="dialog-footer">
          <div className="dialog-actions">
            <button ref={doneRef} type="button" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
