import { useState } from 'react'
import ItemDetail from './ItemDetail'
import EntryEditForm from './EntryEditForm'
import { formatRelativeTime } from '../utils/time'

export default function ItemList({
  entries,
  items,
  categories,
  itemStores,
  brands,
  members = [],
  activeStoreId,
  onMarkBought,
  onDelete,
  onChanged,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // Edit and Remove live in the expanded panel, so the row itself only
  // has the one action people use most in the store: checking it off.
  function toggleExpanded(entryId) {
    setExpandedId(expandedId === entryId ? null : entryId)
    setEditingId(null)
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

  const grouped = visibleEntries.reduce((acc, entry) => {
    const categoryId = itemsById[entry.item_id]?.category_id
    const category = categoriesById[categoryId]?.name || 'uncategorized'
    acc[category] = acc[category] || []
    acc[category].push(entry)
    return acc
  }, {})

  if (!visibleEntries.length) {
    return <p className="empty-state">Nothing needed here right now.</p>
  }

  return (
    <div className="item-list">
      {Object.entries(grouped).map(([category, categoryEntries]) => (
        <div key={category} className="category-group">
          <h3>{category}</h3>
          {categoryEntries.map((entry) => {
            const item = itemsById[entry.item_id]
            const itemBrands = brands.filter((b) => b.item_id === entry.item_id)
            const isExpanded = expandedId === entry.id
            const addedByName = membersById[entry.added_by]?.name
            const isEditing = editingId === entry.id

            return (
              <div key={entry.id} className="list-row">
                <div className="list-row-main">
                  <button
                    type="button"
                    className="check-button"
                    aria-label={`Mark ${item?.name} as bought`}
                    onClick={() => onMarkBought(entry, item)}
                  >
                    <span className="check-circle" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="list-row-toggle"
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    <span className="list-row-text">
                      <span className="list-row-title">
                        <span className="item-name">{item?.name}</span>
                        {entry.quantity && <span className="quantity">{entry.quantity}</span>}
                      </span>
                      {(entry.note || addedByName) && (
                        <span className="list-row-meta">
                          {entry.note && <span className="entry-note">{entry.note}</span>}
                          {addedByName && (
                            <span className="entry-added-by">
                              added by {addedByName}
                              {entry.created_at && ` · ${formatRelativeTime(entry.created_at)}`}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="chevron" aria-hidden="true" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="list-row-panel">
                    {isEditing ? (
                      <EntryEditForm
                        entry={entry}
                        itemName={item?.name}
                        members={members}
                        onSaved={() => {
                          setEditingId(null)
                          onChanged?.()
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        {item && <ItemDetail item={item} brands={itemBrands} />}
                        <div className="list-row-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditingId(entry.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => onDelete(entry, item)}
                          >
                            Remove from list
                          </button>
                        </div>
                      </>
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
