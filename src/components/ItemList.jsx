import { useState } from 'react'
import ItemDetail from './ItemDetail'
import EntryEditForm from './EntryEditForm'

export default function ItemList({
  entries,
  items,
  itemStores,
  brands,
  members = [],
  activeStoreId,
  onMarkBought,
  onDelete,
  isNew,
  onSeen,
  onChanged,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]))

  const visibleEntries = entries.filter((entry) => {
    if (entry.status === 'got') return false
    if (activeStoreId === null) return true
    return itemStores.some(
      (link) => link.item_id === entry.item_id && link.store_id === activeStoreId,
    )
  })

  const grouped = visibleEntries.reduce((acc, entry) => {
    const category = itemsById[entry.item_id]?.category || 'uncategorized'
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
            const highlighted = !!isNew?.(entry)
            const isEditing = editingId === entry.id

            return (
              <div
                key={entry.id}
                className={highlighted ? 'list-row is-new' : 'list-row'}
                onClick={highlighted ? () => onSeen?.(entry.id) : undefined}
              >
                <div className="list-row-main">
                  <button
                    className="item-name"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {item?.name}
                  </button>
                  {highlighted && <span className="new-badge">New</span>}
                  {entry.quantity && <span className="quantity">{entry.quantity}</span>}
                  <button
                    type="button"
                    className="bought-button"
                    onClick={() => onMarkBought(entry, item)}
                  >
                    Bought
                  </button>
                  <button
                    type="button"
                    className="edit-button"
                    aria-label={`Edit ${item?.name}`}
                    onClick={() => setEditingId(isEditing ? null : entry.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    aria-label={`Remove ${item?.name} from the list`}
                    onClick={() => onDelete(entry, item)}
                  >
                    ✕
                  </button>
                </div>
                {isEditing && (
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
                )}
                {!isEditing && (entry.note || addedByName) && (
                  <div className="list-row-meta">
                    {entry.note && <span className="entry-note">{entry.note}</span>}
                    {addedByName && (
                      <span className="entry-added-by">added by {addedByName}</span>
                    )}
                  </div>
                )}
                {isExpanded && item && (
                  <ItemDetail item={item} brands={itemBrands} />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
