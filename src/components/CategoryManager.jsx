import { useEffect, useRef, useState } from 'react'
import { supabase, HOUSEHOLD_ID } from '../supabaseClient'
import { sortCategories } from '../utils/items'
import ActionMenu from './ActionMenu'
import ConfirmDialog from './ConfirmDialog'

function itemCountLabel(count) {
  return count === 1 ? '1 item' : `${count} items`
}

// six dots: the usual "drag me" grip
function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      {[3.5, 8, 12.5].map((y) => (
        <g key={y}>
          <circle cx="5.5" cy={y} r="1.3" />
          <circle cx="10.5" cy={y} r="1.3" />
        </g>
      ))}
    </svg>
  )
}

// One category: read-only (a drag handle, name, item count and a "⋮"
// menu) until someone picks Rename or Merge into… from the menu.
// dragState is 'dragging' for the row being dragged, 'shifting' for the
// others while a drag is on; dragOffset is how far (px) to draw it from
// its resting place.
function CategoryRow({
  category,
  others,
  count,
  index,
  total,
  onMove,
  onChanged,
  dragHandlers,
  dragState,
  dragOffset = 0,
}) {
  const rowRef = useRef(null)
  const handleRef = useRef(null)

  // Arrow keys on the handle move one step, for keyboards and switch
  // access. The row's DOM node moves with it, which can drop focus.
  function handleKeyDown(e) {
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!step) return
    e.preventDefault()
    onMove(category, index + step)
    requestAnimationFrame(() => handleRef.current?.focus())
  }
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

  // The menu item that had focus disappears with the menu, and the row
  // itself jumps to the other end of the list; keep focus on its "⋮" so
  // the next step (another move, or Done) is where it was.
  function moveTo(target) {
    onMove(category, target)
    requestAnimationFrame(() => rowRef.current?.querySelector('.action-menu-button')?.focus())
  }

  const menuItems = [
    // the same moves as dragging the handle, for anyone who'd rather tap
    ...(index > 0
      ? [
          { label: 'Move to top', onSelect: () => moveTo(0) },
          { label: 'Move up', onSelect: () => moveTo(index - 1) },
        ]
      : []),
    ...(index < total - 1
      ? [
          { label: 'Move down', onSelect: () => moveTo(index + 1) },
          { label: 'Move to bottom', onSelect: () => moveTo(total - 1) },
        ]
      : []),
    { label: 'Rename', onSelect: () => startEditing('rename') },
    ...(others.length ? [{ label: 'Merge into…', onSelect: () => startEditing('merge') }] : []),
    { label: 'Delete', danger: true, onSelect: () => setConfirming('delete') },
  ]

  return (
    <li
      className={dragState ? `category-row ${dragState}` : 'category-row'}
      style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
      ref={rowRef}
    >
      {mode === 'view' && (
        <div className="category-row-view">
          {total > 1 && (
            <button
              type="button"
              className="category-drag-handle"
              aria-label={`Reorder ${category.name}: drag, or use the up and down arrow keys`}
              ref={handleRef}
              disabled={busy}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => dragHandlers.start(e, category)}
              onPointerMove={dragHandlers.move}
              onPointerUp={() => dragHandlers.end(true)}
              onPointerCancel={() => dragHandlers.end(false)}
            >
              <GripIcon />
            </button>
          )}
          <span className="category-row-text">
            <span className="category-name">{category.name}</span>
            <span className="category-count">{itemCountLabel(count)}</span>
          </span>
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

// "+ Add category": a button that opens an inline name field. New
// categories have no sort_order yet, so they land at the end of the list.
function AddCategory({ categories, onAdded }) {
  const openRef = useRef(null)
  const formRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // it sits at the end of a scrolling list: bring the whole form (and
  // any error) into view rather than leaving its buttons under the footer
  useEffect(() => {
    if (open) formRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, error])

  const trimmed = name.trim()

  function close() {
    setOpen(false)
    setName('')
    setError(null)
    // back to the button that opened it, which reappears after this render
    requestAnimationFrame(() => openRef.current?.focus())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!trimmed) return
    const clash = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (clash) {
      setError(`"${clash.name}" already exists.`)
      return
    }
    // the app treats this name as "no category" (see resolveCategory)
    if (trimmed.toLowerCase() === 'uncategorized') {
      setError('Items without a category already show as Uncategorized.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase
      .from('categories')
      .insert({ household_id: HOUSEHOLD_ID, name: trimmed })
    setBusy(false)
    if (insertError) {
      console.error(insertError)
      setError("Couldn't add it. Check your connection and try again.")
      return
    }
    onAdded(trimmed)
    close()
  }

  if (!open) {
    return (
      <button
        ref={openRef}
        type="button"
        className="category-add-toggle"
        onClick={() => setOpen(true)}
      >
        + Add category
      </button>
    )
  }

  return (
    <form ref={formRef} className="category-row-edit category-add" onSubmit={handleSubmit}>
      <input
        autoFocus
        aria-label="New category name"
        placeholder="e.g. Snacks"
        autoCapitalize="words"
        enterKeyHint="done"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault() // close the form, not the whole dialog
            close()
          }
        }}
        disabled={busy}
      />
      {error && (
        <p className="field-hint" role="alert">
          {error}
        </p>
      )}
      <div className="category-row-edit-actions">
        <button type="submit" disabled={busy || !trimmed}>
          Add
        </button>
        <button type="button" className="secondary-button" onClick={close} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
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
  const listRef = useRef(null)
  // The drag in progress. The ref holds what the pointer handlers need
  // (start position, where each row was when it began); the state holds
  // what drawing needs: { id, from, to, dy, height }.
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)
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

  // to: the position (0-based) to move the category to
  async function handleMove(category, to) {
    const from = ordered.findIndex((c) => c.id === category.id)
    if (from === to || to < 0 || to >= ordered.length) return
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

  function startDrag(e, category) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const from = ordered.findIndex((c) => c.id === category.id)
    const rects = [...listRef.current.children].map((row) => {
      const { top, height } = row.getBoundingClientRect()
      return { top, height }
    })
    // what scrolls when the list is longer than the dialog
    let scroller = listRef.current.parentElement
    while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY)) {
      scroller = scroller.parentElement
    }
    scroller ||= dialogRef.current
    // keeps the moves coming to the handle even once the finger is off it
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      category,
      from,
      to: from,
      rects,
      scroller,
      startY: e.clientY,
      lastY: e.clientY,
      startScroll: scroller.scrollTop,
      frame: requestAnimationFrame(autoScroll),
    }
    setDrag({ id: category.id, from, to: from, dy: 0, height: rects[from].height })
  }

  function updateDrag() {
    const d = dragRef.current
    if (!d) return
    const first = d.rects[0]
    const last = d.rects.at(-1)
    const own = d.rects[d.from]
    // the list scrolling under a still finger moves the row too
    const moved = d.lastY - d.startY + (d.scroller.scrollTop - d.startScroll)
    const dy = Math.max(
      first.top - own.top,
      Math.min(last.top + last.height - (own.top + own.height), moved),
    )
    // its new place: after every other row whose middle its own middle has passed
    const center = own.top + own.height / 2 + dy
    // (held against the very bottom its middle only just reaches the last
    // row's, hence the half pixel of give for rows below it)
    const to = d.rects.filter((r, i) => {
      if (i === d.from) return false
      const middle = r.top + r.height / 2
      return i > d.from ? middle <= center + 0.5 : middle < center - 0.5
    }).length
    d.to = to
    setDrag((prev) => prev && { ...prev, to, dy })
  }

  function moveDrag(e) {
    if (!dragRef.current) return
    dragRef.current.lastY = e.clientY
    updateDrag()
  }

  // Holding the row near the top or bottom edge scrolls a long list.
  function autoScroll() {
    const d = dragRef.current
    if (!d) return
    const dialog = dialogRef.current
    // the sticky header and footer cover the ends of the scrolling area
    const top = dialog.querySelector('.dialog-header')?.getBoundingClientRect().bottom ?? 0
    const bottom =
      dialog.querySelector('.dialog-footer')?.getBoundingClientRect().top ?? window.innerHeight
    const speed = d.lastY < top + 40 ? -8 : d.lastY > bottom - 40 ? 8 : 0
    if (speed) {
      const before = d.scroller.scrollTop
      d.scroller.scrollTop += speed
      if (d.scroller.scrollTop !== before) updateDrag()
    }
    d.frame = requestAnimationFrame(autoScroll)
  }

  // commit: false when the drag was interrupted (a call, a system gesture)
  function endDrag(commit) {
    const d = dragRef.current
    if (!d) return
    cancelAnimationFrame(d.frame)
    dragRef.current = null
    setDrag(null)
    if (commit) handleMove(d.category, d.to)
  }

  const dragHandlers = { start: startDrag, move: moveDrag, end: endDrag }

  // How far each row is drawn from its resting place mid-drag: the dragged
  // one follows the finger, the ones it has passed step aside by its height.
  function dragOffsetFor(category, index) {
    if (!drag) return 0
    if (category.id === drag.id) return drag.dy
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.height
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return drag.height
    return 0
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
              Drag them into the order you walk the store; the list follows it.
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
            <ul className={drag ? 'category-rows dragging' : 'category-rows'} ref={listRef}>
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
                  dragHandlers={dragHandlers}
                  dragState={drag && (drag.id === category.id ? 'dragging' : 'shifting')}
                  dragOffset={dragOffsetFor(category, index)}
                />
              ))}
            </ul>
          ) : (
            <p className="field-note">
              No categories yet. Add your store's sections here (Produce, Dairy…), or type a
              new one into an item's Category field.
            </p>
          )}
          <AddCategory
            categories={categories}
            onAdded={(name) => {
              setAnnouncement(`Added ${name}.`)
              onChanged()
            }}
          />
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
