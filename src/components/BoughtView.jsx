import { useEffect, useRef, useState } from 'react'
import { formatRelativeTime } from '../utils/time'

// "⋯" button with a small menu of actions for one row. Closes on an
// outside tap or Escape.
function RowMenu({ label, onMoveBack, onDelete }) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggle() {
    // near the bottom of the screen, open upward so the menu stays visible
    const rect = buttonRef.current.getBoundingClientRect()
    setOpenUp(window.innerHeight - rect.bottom < 140)
    setOpen(!open)
  }

  function choose(action) {
    setOpen(false)
    action()
  }

  return (
    <div className="row-menu" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="row-menu-button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div className={openUp ? 'row-menu-list up' : 'row-menu-list'} role="menu">
          <button type="button" role="menuitem" onClick={() => choose(onMoveBack)}>
            Move back to list
          </button>
          <button
            type="button"
            role="menuitem"
            className="row-menu-danger"
            onClick={() => choose(onDelete)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function BoughtView({ entries, items, members = [], onMoveBack, onDeleteForever }) {
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]))

  const bought = entries
    .filter((e) => e.status === 'got')
    .sort((a, b) => new Date(b.bought_at || b.created_at) - new Date(a.bought_at || a.created_at))

  // ignore ids that left the tab meanwhile (e.g. someone else's change)
  const selected = bought.filter((e) => selectedIds.includes(e.id))
  const allSelected = bought.length > 0 && selected.length === bought.length

  function exitSelecting() {
    setSelecting(false)
    setSelectedIds([])
  }

  function toggleSelected(entryId) {
    setSelectedIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId],
    )
  }

  function runBatch(action) {
    if (!selected.length) return
    // stay in select mode if the user cancels the delete confirm
    if (action(selected)) exitSelecting()
  }

  if (!bought.length) {
    return <p className="empty-state">Nothing bought yet.</p>
  }

  return (
    <div className={selecting ? 'bought-view selecting' : 'bought-view'}>
      <div className="bought-toolbar">
        {selecting ? (
          <>
            <button
              type="button"
              className="link-button"
              onClick={() => setSelectedIds(allSelected ? [] : bought.map((e) => e.id))}
            >
              {allSelected ? 'Select none' : 'Select all'}
            </button>
            <span className="bought-toolbar-count">{selected.length} selected</span>
            <button type="button" className="secondary-button" onClick={exitSelecting}>
              Done
            </button>
          </>
        ) : (
          <>
            <span className="bought-toolbar-count">
              {bought.length === 1 ? '1 item' : `${bought.length} items`}
            </span>
            <button type="button" className="secondary-button" onClick={() => setSelecting(true)}>
              Select
            </button>
          </>
        )}
      </div>

      {bought.map((entry) => {
        const item = itemsById[entry.item_id]
        const addedByName = membersById[entry.added_by]?.name
        const isSelected = selectedIds.includes(entry.id)

        const details = (
          <span className="bought-row-text">
            <span className="list-row-title">
              <span className="item-name">{item?.name}</span>
              {entry.quantity && <span className="quantity">{entry.quantity}</span>}
            </span>
            <span className="list-row-meta">
              {entry.note && <span className="entry-note">{entry.note}</span>}
              {addedByName && <span className="entry-added-by">added by {addedByName}</span>}
              <span className="entry-bought-at">
                bought {formatRelativeTime(entry.bought_at || entry.created_at)}
              </span>
            </span>
          </span>
        )

        return (
          <div key={entry.id} className={isSelected ? 'bought-row selected' : 'bought-row'}>
            {selecting ? (
              // the whole row is the checkbox's label, so any tap toggles it
              <label className="bought-row-select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelected(entry.id)}
                />
                {details}
              </label>
            ) : (
              <>
                {details}
                <RowMenu
                  label={item?.name || 'item'}
                  onMoveBack={() => onMoveBack([entry])}
                  onDelete={() => onDeleteForever([entry])}
                />
              </>
            )}
          </div>
        )
      })}

      {selecting && (
        <div className="batch-bar">
          <button
            type="button"
            className="secondary-button"
            disabled={!selected.length}
            onClick={() => runBatch(onMoveBack)}
          >
            Move back to list
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={!selected.length}
            onClick={() => runBatch(onDeleteForever)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
