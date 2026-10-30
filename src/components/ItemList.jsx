import { useState } from 'react'
import ItemDetail from './ItemDetail'
import EntryEditForm from './EntryEditForm'
import ItemEditForm from './ItemEditForm'
import { formatRelativeTime } from '../utils/time'

export default function ItemList({
  entries,
  items,
  categories,
  itemStores,
  brands,
  stores,
  members = [],
  activeStoreId,
  onMarkBought,
  onDelete,
  onChanged,
  onStoreAdded,
}) {
  const [expandedId, setExpandedId] = useState(null)
  // what the expanded panel is editing: 'entry' (qty, note, who) or
  // 'item' (the catalog item's brands, stores and tips), or null
  const [editing, setEditing] = useState(null)

  // Edit and Remove live in the expanded panel, so the row itself only
  // has the one action people use most in the store: checking it off.
  function toggleExpanded(entryId) {
    setExpandedId(expandedId === entryId ? null : entryId)
    setEditing(null)
  }

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
    return <p className="empty-state">Nothing needed here right now.</p>
  }

  return (
    <div className="item-list">
      {groups.map((group) => (
        <div key={group.key} className="category-group">
          <h3>{group.name}</h3>
          {group.entries.map((entry) => {
            const item = itemsById[entry.item_id]
            const itemBrands = brands.filter((b) => b.item_id === entry.item_id)
            const isExpanded = expandedId === entry.id
            const addedByName = membersById[entry.added_by]?.name

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
                    {editing === 'entry' && (
                      <EntryEditForm
                        entry={entry}
                        itemName={item?.name}
                        members={members}
                        onSaved={finishEditing}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                    {editing === 'item' && item && (
                      <div className="catalog-edit-panel">
                        <ItemEditForm
                          item={item}
                          categories={categories}
                          stores={stores}
                          storeIds={itemStores
                            .filter((link) => link.item_id === item.id)
                            .map((link) => link.store_id)}
                          brands={itemBrands}
                          onSaved={finishEditing}
                          onCancel={() => setEditing(null)}
                          onStoreAdded={onStoreAdded}
                        />
                      </div>
                    )}
                    {!editing && (
                      <>
                        {item && <ItemDetail item={item} brands={itemBrands} />}
                        {item && (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => setEditing('item')}
                          >
                            Edit brands, stores &amp; tips
                          </button>
                        )}
                        <div className="list-row-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditing('entry')}
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
