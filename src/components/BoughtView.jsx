import { useEffect, useRef, useState } from 'react'
import { dayKey, formatDayLabel, formatTimeOfDay } from '../utils/time'
import { searchByName } from '../utils/search'
import EmptyState from './EmptyState'

// How much history shows at first, and how much more each "Show older"
// tap adds. Months of purchases make a long scroll on a phone, and the
// recent trips are almost always the ones people come here for.
const WINDOW_DAYS = 30
const DAY_MS = 86400000

function itemCount(count) {
  return count === 1 ? '1 item' : `${count} items`
}

function boughtAt(entry) {
  return entry.bought_at || entry.created_at
}

// Checkbox for a whole day: checked when all of its items are selected,
// a dash (indeterminate) when only some are. Indeterminate can only be
// set from script, hence the ref.
function DayCheckbox({ entries, selectedIds, onToggle, label }) {
  const ref = useRef(null)
  const count = entries.filter((e) => selectedIds.includes(e.id)).length
  const checked = count === entries.length
  const partial = count > 0 && !checked

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial
  }, [partial])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={`Select everything bought ${label}`}
      checked={checked}
      onChange={onToggle}
    />
  )
}

// "⋮" button with a small menu of actions for one row. actions: [{ label,
// hint?, onSelect, disabled?, danger? }]. Closes on an outside tap or
// Escape.
function RowMenu({ label, actions }) {
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
    // near the bottom of the screen (above the tab bar), open upward so
    // the whole menu stays visible: roughly 56px per action plus padding
    const rect = buttonRef.current.getBoundingClientRect()
    setOpenUp(window.innerHeight - rect.bottom < 60 * actions.length + 80)
    setOpen(!open)
  }

  function choose(action) {
    setOpen(false)
    // the menu item that had focus is gone; keep focus on this row
    buttonRef.current?.focus()
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
        <span aria-hidden="true">⋮</span>
      </button>
      {open && (
        <div className={openUp ? 'row-menu-list up' : 'row-menu-list'} role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={action.danger ? 'row-menu-danger' : undefined}
              disabled={action.disabled}
              onClick={() => choose(action.onSelect)}
            >
              {action.label}
              {/* says what the action does to the purchase record, since
                  "Buy again" and "Move back to list" both put it on the list */}
              {action.hint && <span className="row-menu-hint">{action.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BoughtView({
  entries,
  items,
  members = [],
  onMoveBack,
  onDeleteForever,
  onBuyAgain,
}) {
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [windowDays, setWindowDays] = useState(WINDOW_DAYS)
  // item ids being added right now, so a second tap doesn't add twice
  // before the new entry comes back
  const [adding, setAdding] = useState([])

  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]))
  // items with a 'needed' entry: "Buy again" would only duplicate them
  const onList = new Set(entries.filter((e) => e.status === 'needed').map((e) => e.item_id))

  const bought = entries
    .filter((e) => e.status === 'got')
    .sort((a, b) => new Date(boughtAt(b)) - new Date(boughtAt(a)))

  const query = search.trim()
  // whole calendar days, so a day's trip is never cut in half
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = today.getTime() - (windowDays - 1) * DAY_MS

  // A search looks through all of the history; otherwise only the recent
  // window shows, and "Show older" widens it.
  let shown
  let hasOlder = false
  if (query) {
    const matches = new Set(searchByName(items, query).map((i) => i.id))
    shown = bought.filter((e) => matches.has(e.item_id))
  } else {
    shown = bought.filter((e) => dayKey(boughtAt(e)) >= cutoff)
    hasOlder = shown.length < bought.length
  }

  // already newest first, so each day's entries are next to each other
  const days = []
  for (const entry of shown) {
    const key = dayKey(boughtAt(entry))
    if (days.at(-1)?.key !== key) {
      days.push({ key, label: formatDayLabel(boughtAt(entry)), entries: [] })
    }
    days.at(-1).entries.push(entry)
  }

  // only what's showing: ignores ids hidden by a search or the date
  // window, and ones that left the tab meanwhile (someone else's change)
  const selected = shown.filter((e) => selectedIds.includes(e.id))
  const allSelected = shown.length > 0 && selected.length === shown.length
  const selectedRequests = buyAgainRequests(selected)

  // One request per item that isn't already on the list (several
  // purchases of the same thing add it once), with the most recent
  // purchase's quantity.
  function buyAgainRequests(fromEntries) {
    const requests = []
    const seen = new Set()
    for (const entry of fromEntries) {
      const item = itemsById[entry.item_id]
      if (!item || seen.has(item.id) || onList.has(item.id) || adding.includes(item.id)) continue
      seen.add(item.id)
      requests.push({ item, quantity: entry.quantity || null })
    }
    return requests
  }

  async function buyAgain(requests) {
    if (!requests.length) return false
    const ids = requests.map((r) => r.item.id)
    setAdding((prev) => [...prev, ...ids])
    // App shows the "Added … to the list" toast, with Undo
    const ok = await onBuyAgain(requests)
    setAdding((prev) => prev.filter((id) => !ids.includes(id)))
    return ok
  }

  // "Show older" adds another window; if that would still reveal nothing
  // (a gap of a few months), it reaches back to the next older purchase.
  function showOlder() {
    const nextOlder = bought.find((e) => dayKey(boughtAt(e)) < cutoff)
    if (!nextOlder) return
    const daysBack = Math.round((today.getTime() - dayKey(boughtAt(nextOlder))) / DAY_MS) + 1
    setWindowDays(Math.max(windowDays + WINDOW_DAYS, daysBack))
  }

  function exitSelecting() {
    setSelecting(false)
    setSelectedIds([])
  }

  function toggleSelected(entryId) {
    setSelectedIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId],
    )
  }

  // select a whole day (one shopping trip), or clear it if it's all selected
  function toggleDay(dayEntries) {
    const ids = dayEntries.map((e) => e.id)
    const allIn = ids.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) =>
      allIn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])],
    )
  }

  function runBatch(action) {
    if (!selected.length) return
    // an action returns false if it did not go ahead; stay in select mode then
    if (action(selected)) exitSelecting()
  }

  async function runBuyAgainBatch() {
    // already-listed items are skipped; the toast says how many went on
    if (await buyAgain(selectedRequests)) exitSelecting()
  }

  if (!bought.length) {
    return (
      <EmptyState
        icon="bought"
        title="Nothing bought yet"
        hint="Things you check off the list show up here, so you can see what was bought and when."
      />
    )
  }

  // what the count describes: matches, or the date window
  const countLabel = query
    ? `${itemCount(shown.length)} found`
    : hasOlder
      ? `${itemCount(shown.length)} · last ${windowDays} days`
      : itemCount(shown.length)

  // Shown in select mode when nothing selected can be bought again, so
  // the disabled button isn't a mystery.
  const allOnList = selected.length > 0 && !selectedRequests.length && !adding.length

  return (
    <div className={selecting ? 'bought-view selecting' : 'bought-view'}>
      <input
        type="search"
        className="bought-search"
        placeholder="Search purchases…"
        aria-label="Search purchases"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bought-toolbar">
        {selecting ? (
          <>
            <button
              type="button"
              className="link-button"
              disabled={!shown.length}
              onClick={() => setSelectedIds(allSelected ? [] : shown.map((e) => e.id))}
            >
              {allSelected ? 'Select none' : 'Select all'}
            </button>
            <span className="bought-toolbar-count" aria-live="polite">
              {selected.length} selected
              {allOnList && (selected.length === 1 ? ', already on the list' : ', all on the list')}
            </span>
            <button type="button" className="secondary-button" onClick={exitSelecting}>
              Done
            </button>
          </>
        ) : (
          <>
            <span className="bought-toolbar-count">{countLabel}</span>
            <button
              type="button"
              className="secondary-button"
              disabled={!shown.length}
              onClick={() => setSelecting(true)}
            >
              Select
            </button>
          </>
        )}
      </div>

      {!shown.length &&
        (query ? (
          <EmptyState
            icon="search"
            title={`Nothing bought matches "${query}"`}
            hint="Check the spelling, or try part of the name."
          />
        ) : (
          <EmptyState
            icon="bought"
            title={`Nothing bought in the last ${windowDays} days`}
            hint="Older purchases are still here."
            actionLabel="Show older"
            onAction={showOlder}
          />
        ))}

      {days.map((day) => {
        const dayCount = itemCount(day.entries.length)
        return (
          <section key={day.key} className="bought-day" aria-label={day.label}>
            <div className="bought-day-header">
              {selecting ? (
                // same checkbox as the rows; ticking it selects the whole day
                <label className="bought-day-select">
                  <DayCheckbox
                    entries={day.entries}
                    selectedIds={selectedIds}
                    onToggle={() => toggleDay(day.entries)}
                    label={day.label}
                  />
                  <h3>{day.label}</h3>
                </label>
              ) : (
                <h3>{day.label}</h3>
              )}
              <span className="bought-day-count">{dayCount}</span>
            </div>
            {day.entries.map((entry) => {
              const item = itemsById[entry.item_id]
              const name = item?.name || 'item'
              const boughtByName = membersById[entry.bought_by]?.name
              const isSelected = selectedIds.includes(entry.id)
              const alreadyOnList = onList.has(entry.item_id)

              // The day heading already says when, so the meta is just the
              // time and who; screen readers still hear "bought at … by …".
              // The note gets its own line so it doesn't run into the time.
              const details = (
                <span className="bought-row-text">
                  <span className="bought-row-title">
                    <span className="item-name">{item?.name}</span>
                    {entry.quantity && <span className="quantity">{entry.quantity}</span>}
                  </span>
                  {entry.note && <span className="bought-row-note">{entry.note}</span>}
                  <span className="bought-row-meta">
                    <span className="visually-hidden">Bought at </span>
                    {formatTimeOfDay(boughtAt(entry))}
                    {boughtByName && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="visually-hidden"> by </span>
                        {boughtByName}
                      </>
                    )}
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
                        label={name}
                        actions={[
                          alreadyOnList
                            ? { label: 'Already on the list', disabled: true, onSelect: () => {} }
                            : {
                                label: 'Buy again',
                                hint: 'Adds it to the list, keeps this record',
                                disabled: !item || adding.includes(item.id),
                                onSelect: () => buyAgain(buyAgainRequests([entry])),
                              },
                          {
                            label: 'Move back to list',
                            hint: "Wasn't bought after all",
                            onSelect: () => onMoveBack([entry]),
                          },
                          { label: 'Delete', danger: true, onSelect: () => onDeleteForever([entry]) },
                        ]}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}

      {hasOlder && shown.length > 0 && (
        <div className="bought-older">
          <button type="button" className="secondary-button" onClick={showOlder}>
            Show older
          </button>
        </div>
      )}

      {selecting && (
        // Short labels so three buttons fit a 320px screen; the accessible
        // names start with the visible text and spell the action out.
        <div className="batch-bar">
          <button
            type="button"
            disabled={!selectedRequests.length}
            aria-label={
              allOnList
                ? 'Already on the list'
                : 'Buy again: add to the list and keep these records'
            }
            onClick={runBuyAgainBatch}
          >
            {/* says why it's disabled right where people are looking */}
            {allOnList ? 'On the list' : 'Buy again'}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!selected.length}
            aria-label="Move back to list: they weren't bought after all"
            onClick={() => runBatch(onMoveBack)}
          >
            Move back
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
