import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { sortCategories } from '../utils/items'
import ActionMenu from './ActionMenu'
import ConfirmDialog from './ConfirmDialog'

function itemCountLabel(count) {
  return count === 1 ? '1 item' : `${count} items`
}

function ArrowIcon({ direction }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={direction === 'up' ? 'M3.5 10 8 5.5l4.5 4.5' : 'M3.5 6 8 10.5 12.5 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// One category: read-only (name, item count, move buttons and a "⋮"
// menu) until someone picks Rename or Merge into… from the menu.
function CategoryRow({ category, others, count, index, total, onMove, onChanged }) {
  const upRef = useRef(null)
  const downRef = useRef(null)
  const [mode, setMode] = useState('view') // 'view' | 'rename' | 'merge'
  const [confirming, setConfirming] = useState(null) // 'merge' | 'delete' | null
  const [name, setName] = useState(category.name)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const trimmed = name.trim()
  const mergeTarget = others.find((c) => c.id === mergeTargetId)

  function startEditing(nextMode) {
    setName(category.name)
    setMergeTargetId('')
    setError(null)
    setMode(nextMode)
  }

  async function run(action) {
    setBusy(true)
    setError(null)
    const message = await action()
    setBusy(false)
    setConfirming(null)
    if (message) {
      setError(message)
      return
    }
    setMode('view')
    onChanged()
  }

  function handleRename(e) {
    e.preventDefault()
    if (!trimmed || trimmed === category.name) {
      setMode('view')
      return
    }
    const clash = others.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (clash) {
      setError(`"${clash.name}" already exists. Use "Merge into…" to combine them.`)
      return
    }
    run(async () => {
      const { error } = await supabase
        .from('categories')
        .update({ name: trimmed })
        .eq('id', category.id)
      if (error) {
        console.error(error)
        return "Couldn't rename it. Try again."
      }
    })
  }

  function handleMerge() {
    if (!mergeTarget) return
    run(async () => {
      const { error: moveError } = await supabase
        .from('items')
        .update({ category_id: mergeTarget.id })
        .eq('category_id', category.id)
      // stop here rather than delete a category that still has items
      if (moveError) {
        console.error(moveError)
        return "Couldn't move the items. Try again."
      }
      const { error } = await supabase.from('categories').delete().eq('id', category.id)
      if (error) {
        console.error(error)
        return "Moved the items, but couldn't delete the old category."
      }
    })
  }

  function handleDelete() {
    run(async () => {
      // items.category_id is "on delete set null", so its items fall back
      // to uncategorized on their own
      const { error } = await supabase.from('categories').delete().eq('id', category.id)
      if (error) {
        console.error(error)
        return "Couldn't delete it. Try again."
      }
    })
  }

  const menuItems = [
    { label: 'Rename', onSelect: () => startEditing('rename') },
    ...(others.length ? [{ label: 'Merge into…', onSelect: () => startEditing('merge') }] : []),
    { label: 'Delete', danger: true, onSelect: () => setConfirming('delete') },
  ]

  return (
    <li className="category-row">
      {mode === 'view' && (
        <div className="category-row-view">
          <span className="category-row-text">
            <span className="category-name">{category.name}</span>
            <span className="category-count">{itemCountLabel(count)}</span>
          </span>
          <button
            type="button"
            className="category-move-button"
            aria-label={`Move ${category.name} up`}
            ref={upRef}
            disabled={index === 0}
            onClick={() => {
              // this button is about to be disabled; keep focus in the row
              if (index === 1) downRef.current?.focus()
              onMove(category, -1)
            }}
          >
            <ArrowIcon direction="up" />
          </button>
          <button
            type="button"
            className="category-move-button"
            aria-label={`Move ${category.name} down`}
            ref={downRef}
            disabled={index === total - 1}
            onClick={() => {
              if (index === total - 2) upRef.current?.focus()
              onMove(category, 1)
            }}
          >
            <ArrowIcon direction="down" />
          </button>
          <ActionMenu label={`More actions for ${category.name}`} items={menuItems} disabled={busy} />
        </div>
      )}

      {mode === 'rename' && (
        <form className="category-row-edit" onSubmit={handleRename}>
          <input
            autoFocus
            aria-label={`New name for ${category.name}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault() // close the rename, not the whole dialog
                setMode('view')
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
              onClick={() => setMode('view')}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'merge' && (
        <div className="category-row-edit">
          <label className="dialog-field">
            <span className="field-label">
              Move {itemCountLabel(count)} from {category.name} into
            </span>
            <select
              autoFocus
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              disabled={busy}
            >
              <option value="">Choose a category…</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="category-row-edit-actions">
            <button
              type="button"
              onClick={() => setConfirming('merge')}
              disabled={busy || !mergeTarget}
            >
              Merge
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setMode('view')}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="field-hint" role="alert">
          {error}
        </p>
      )}

      {confirming === 'merge' && mergeTarget && (
        <ConfirmDialog
          title={`Merge into ${mergeTarget.name}?`}
          message={`${count ? `${itemCountLabel(count)} move from "${category.name}" to "${mergeTarget.name}", and ` : ''}"${category.name}" is deleted.`}
          confirmLabel="Merge"
          busy={busy}
          onConfirm={handleMerge}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === 'delete' && (
        <ConfirmDialog
          title={`Delete ${category.name}?`}
          message={
            count
              ? `Its ${itemCountLabel(count)} become uncategorized. The items themselves stay.`
              : 'No items use it.'
          }
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </li>
  )
}

// Postgres / PostgREST codes for a column that doesn't exist: what a
// reorder gets before migrations/003_category_order.sql has been run.
const MISSING_COLUMN = ['42703', 'PGRST204']

// Modal for putting categories in store-aisle order and for renaming,
// merging and deleting them. Merging moves every item in one category
// into another and deletes the empty one.
export default function CategoryManager({ categories, items, onChanged, onClose }) {
  const dialogRef = useRef(null)
  const doneRef = useRef(null)
  // ids in the order just chosen here, shown until the saved order comes
  // back from the server (or put back if the save fails)
  const [pendingOrder, setPendingOrder] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    dialogRef.current?.showModal()
    // showModal focuses the first control; start on Done instead
    doneRef.current?.focus()
  }, [])

  // fresh rows from the server replace the local guess
  useEffect(() => setPendingOrder(null), [categories])

  const byId = Object.fromEntries(categories.map((c) => [c.id, c]))
  const saved = sortCategories(categories)
  const ordered = pendingOrder
    ? [
        ...pendingOrder.map((id) => byId[id]).filter(Boolean),
        ...saved.filter((c) => !pendingOrder.includes(c.id)),
      ]
    : saved

  const counts = items.reduce((acc, item) => {
    if (item.category_id) acc[item.category_id] = (acc[item.category_id] || 0) + 1
    return acc
  }, {})
  const uncategorized = items.filter((i) => !i.category_id).length

  async function handleMove(category, delta) {
    const from = ordered.findIndex((c) => c.id === category.id)
    const to = from + delta
    if (to < 0 || to >= ordered.length) return
    const next = [...ordered]
    next.splice(from, 1)
    next.splice(to, 0, category)
    setPendingOrder(next.map((c) => c.id))
    setOrderError(null)
    setAnnouncement(`${category.name} moved to position ${to + 1} of ${next.length}.`)

    // number every category, so ones never placed before (null) get a
    // spot too; only rows whose number changes are written
    const changed = next.filter((c, index) => c.sort_order !== index)
    const results = await Promise.all(
      changed.map((c) =>
        supabase
          .from('categories')
          .update({ sort_order: next.indexOf(c) })
          .eq('id', c.id),
      ),
    )
    const failed = results.find((res) => res.error)
    if (failed) {
      console.error(failed.error)
      setPendingOrder(null)
      setOrderError(
        MISSING_COLUMN.includes(failed.error.code)
          ? "Custom order isn't set up on this database yet, so categories stay alphabetical. Whoever manages the app can run migrations/003_category_order.sql to turn it on."
          : "Couldn't save the new order. Check your connection and try again.",
      )
      return
    }
    onChanged()
  }

  return (
    <dialog
      ref={dialogRef}
      className="item-dialog"
      aria-labelledby="category-manager-title"
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
          <h2 id="category-manager-title">Categories</h2>
          {categories.length > 1 && (
            <p className="field-note">
              Put them in the order you walk the store; the list follows it.
            </p>
          )}
        </div>

        <div className="dialog-body category-manager">
          {orderError && (
            <p className="dialog-notice" role="alert">
              {orderError}
            </p>
          )}
          {categories.length ? (
            <ul className="category-rows">
              {ordered.map((category, index) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  others={ordered.filter((c) => c.id !== category.id)}
                  count={counts[category.id] || 0}
                  index={index}
                  total={ordered.length}
                  onMove={handleMove}
                  onChanged={onChanged}
                />
              ))}
            </ul>
          ) : (
            <p className="field-note">
              No categories yet. Add one by typing it into an item's Category field.
            </p>
          )}
          {uncategorized > 0 && (
            <p className="field-note">{itemCountLabel(uncategorized)} uncategorized</p>
          )}
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
