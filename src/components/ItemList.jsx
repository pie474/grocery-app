import { useEffect, useRef, useState } from 'react'
import ItemDetail from './ItemDetail'
import EntryEditForm from './EntryEditForm'
import ItemEditDialog from './ItemEditDialog'
import { formatRelativeTime } from '../utils/time'
import ListEmptyState from './ListEmptyState'

// How long a checked-off row stays on screen: the circle fills and the
// name is struck through, then the row collapses. Matches list.css.
const CHECK_ANIMATION_MS = 340

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function ItemList({
  entries,
  items,
  categories,
  itemStores,
  brands,
  stores,
  members = [],
  activeStoreId,
  onClearStore,
  onMarkBought,
  onDelete,
  onChanged,
  onStoreAdded,
}) {
  const [expandedId, setExpandedId] = useState(null)
  // what the expanded panel is editing: 'entry' (qty, note, who; inline)
  // or 'item' (the catalog item's details; in a dialog), or null
  const [editing, setEditing] = useState(null)

  // Edit and Remove live in the expanded panel, so the row itself only
  // has the one action people use most in the store: checking it off.
  function toggleExpanded(entryId) {
    setExpandedId(expandedId === entryId ? null : entryId)
    setEditing(null)
  }

  // Entries mid check-off animation, by id, with the height their row had
  // when tapped (the collapse animates from it). App removes an entry from
  // the list as soon as onMarkBought is called, so we hold off calling it
  // until the animation has played.
  const [checking, setChecking] = useState({})
  const pendingChecks = useRef(new Map())

  function markBought(event, entry, item) {
    if (pendingChecks.current.has(entry.id)) return
    if (prefersReducedMotion()) {
      onMarkBought(entry, item)
      return
    }
    const row = event.currentTarget.closest('.list-row')
    const timer = setTimeout(() => {
      pendingChecks.current.delete(entry.id)
      setChecking(({ [entry.id]: _done, ...rest }) => rest)
      onMarkBought(entry, item)
    }, CHECK_ANIMATION_MS)
    pendingChecks.current.set(entry.id, { timer, entry, item })
    setChecking((prev) => ({ ...prev, [entry.id]: row?.offsetHeight }))
  }

  // Switching views mid-animation unmounts the list: still record the
  // purchases rather than silently dropping them.
  const onMarkBoughtRef = useRef(onMarkBought)
  onMarkBoughtRef.current = onMarkBought
  useEffect(() => {
    const pending = pendingChecks.current
    return () => {
      pending.forEach(({ timer, entry, item }) => {
        clearTimeout(timer)
        onMarkBoughtRef.current(entry, item)
      })
      pending.clear()
    }
  }, [])

  function finishEditing() {
    setEditing(null)
    onChanged?.()
  }

  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]))
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))

  const visibleEntries = entries.filter((entry) => {
    if (entry.status === 'got') return false
    if (activeStoreId === null) return true
    return itemStores.some(
      (link) => link.item_id === entry.item_id && link.store_id === activeStoreId,
    )
  })

  // Alphabetical, with uncategorized last, so groups don't jump around
  // as entries are added.
  const groups = Object.values(
    visibleEntries.reduce((acc, entry) => {
      const category = categoriesById[itemsById[entry.item_id]?.category_id]
      const key = category?.id || 'uncategorized'
      acc[key] = acc[key] || { key, name: category?.name || 'Uncategorized', entries: [] }
      acc[key].entries.push(entry)
      return acc
    }, {}),
  ).sort((a, b) => {
    if (a.key === 'uncategorized') return 1
    if (b.key === 'uncategorized') return -1
    return a.name.localeCompare(b.name)
  })

  if (!visibleEntries.length) {
    return (
      <ListEmptyState
        entries={entries}
        stores={stores}
        activeStoreId={activeStoreId}
        onClearStore={onClearStore}
      />
    )
  }

  return (
    <div className="item-list">
      {groups.map((group) => (
        <div key={group.key} className="category-group">
          <h3>
            {group.name}
            <span className="category-count" aria-label={`, ${group.entries.length} items`}>
              {group.entries.length}
            </span>
          </h3>
          {group.entries.map((entry) => {
            const item = itemsById[entry.item_id]
            const itemBrands = brands.filter((b) => b.item_id === entry.item_id)
            const isExpanded = expandedId === entry.id
            const addedByName = membersById[entry.added_by]?.name
            const addedAgo = entry.created_at && formatRelativeTime(entry.created_at)
            const isChecking = entry.id in checking

            return (
              <div
                key={entry.id}
                className={`list-row${isChecking ? ' is-checking' : ''}`}
                style={isChecking ? { '--row-height': `${checking[entry.id]}px` } : undefined}
              >
                <div className="list-row-main">
                  <button
                    type="button"
                    className="check-button"
                    aria-label={`Mark ${item?.name} as bought`}
                    aria-pressed={isChecking}
                    onClick={(event) => markBought(event, entry, item)}
                  >
                    <span className="check-circle" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="list-row-toggle"
                    aria-expanded={isExpanded}
                    disabled={isChecking}
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <span className="list-row-text">
                      <span className="list-row-title">
                        <span className="item-name">{item?.name}</span>
                        {entry.quantity && <span className="quantity">{entry.quantity}</span>}
                      </span>
                      {entry.note && <span className="list-row-meta">{entry.note}</span>}
                    </span>
                    {/* who added it, kept quiet: an initial and a time, with
                        the full sentence for screen readers and on hover */}
                    {addedByName && (
                      <span
                        className="entry-added-by"
                        title={`Added by ${addedByName}${addedAgo ? `, ${addedAgo}` : ''}`}
                      >
                        <span className="visually-hidden">
                          Added by {addedByName}
                          {addedAgo && `, ${addedAgo}`}
                        </span>
                        <span className="avatar" aria-hidden="true">
                          {addedByName.charAt(0).toUpperCase()}
                        </span>
                        {addedAgo && <span aria-hidden="true">{addedAgo}</span>}
                      </span>
                    )}
                    <span className="chevron" aria-hidden="true" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="list-row-panel">
                    {item && <ItemDetail item={item} brands={itemBrands} />}
                    {editing === 'entry' ? (
                      <EntryEditForm
                        entry={entry}
                        itemName={item?.name}
                        members={members}
                        onSaved={finishEditing}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <div className="entry-panel-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditing('entry')}
                        >
                          Edit quantity &amp; note
                        </button>
                        {item && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditing('item')}
                          >
                            Edit item details
                          </button>
                        )}
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => onDelete(entry, item)}
                        >
                          Remove from list
                        </button>
                      </div>
                    )}
                    {editing === 'item' && item && (
                      <ItemEditDialog
                        item={item}
                        categories={categories}
                        stores={stores}
                        storeIds={itemStores
                          .filter((link) => link.item_id === item.id)
                          .map((link) => link.store_id)}
                        brands={itemBrands}
                        onSaved={finishEditing}
                        onClose={() => setEditing(null)}
                        onStoreAdded={onStoreAdded}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
