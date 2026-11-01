import { useState } from 'react'
import ItemDetail from './ItemDetail'
import EntryFields from './EntryFields'
import ItemEditDialog from './ItemEditDialog'
import OverflowMenu from './OverflowMenu'
import PhotoViewer from './PhotoViewer'
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
  onUpdateEntry,
  onChanged,
  onStoreAdded,
}) {
  const [expandedId, setExpandedId] = useState(null)
  // the panel that's animating shut, kept mounted until it finishes
  const [closingId, setClosingId] = useState(null)
  // the open panel once its animation is done; only then can things like
  // the ⋮ menu spill outside it
  const [settledId, setSettledId] = useState(null)
  const [editingItemId, setEditingItemId] = useState(null)
  const [photo, setPhoto] = useState(null) // { src, alt }

  // The row itself only has the one action people use most in the store,
  // checking it off; everything else lives in the expanded panel.
  function toggleExpanded(entryId) {
    if (expandedId) setClosingId(expandedId)
    setExpandedId(expandedId === entryId ? null : entryId)
  }

  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]))
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const storesById = Object.fromEntries(stores.map((s) => [s.id, s]))

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

  const editingItem = editingItemId && itemsById[editingItemId]

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
            const isClosing = !isExpanded && closingId === entry.id
            const addedByName = membersById[entry.added_by]?.name
            const storeNames = itemStores
              .filter((link) => link.item_id === entry.item_id)
              .map((link) => storesById[link.store_id]?.name)
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b))
            const facts = [
              storeNames.join(', '),
              item?.last_bought_at && `last bought ${formatRelativeTime(item.last_bought_at)}`,
            ].filter(Boolean)

            return (
              <div key={entry.id} className={isExpanded ? 'list-row expanded' : 'list-row'}>
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
                      {/* the note is editable in the open panel, so not repeated here */}
                      {((entry.note && !isExpanded) || addedByName) && (
                        <span className="list-row-meta">
                          {entry.note && !isExpanded && (
                            <span className="entry-note">{entry.note}</span>
                          )}
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
                {(isExpanded || isClosing) && (
                  <div
                    className={
                      isClosing
                        ? 'list-row-panel-wrap closing'
                        : settledId === entry.id
                          ? 'list-row-panel-wrap settled'
                          : 'list-row-panel-wrap'
                    }
                    inert={isClosing ? '' : undefined}
                    onAnimationEnd={(e) => {
                      // ignore animations bubbling up from inside the panel
                      if (e.target !== e.currentTarget) return
                      if (isClosing) setClosingId(null)
                      else setSettledId(entry.id)
                    }}
                  >
                    <div className="list-row-panel">
                      {item && (
                        <ItemDetail
                          item={item}
                          brands={itemBrands}
                          onPhotoClick={setPhoto}
                          onAddDetails={() => setEditingItemId(item.id)}
                        />
                      )}
                      <EntryFields
                        entry={entry}
                        onSave={(changes) => onUpdateEntry(entry, changes)}
                      />
                      <div className="list-row-footer">
                        <span className="list-row-facts">{facts.join(' · ')}</span>
                        <OverflowMenu
                          label={`More actions for ${item?.name || 'item'}`}
                          actions={[
                            ...(item
                              ? [{ label: 'Edit item', onSelect: () => setEditingItemId(item.id) }]
                              : []),
                            {
                              label: 'Remove from list',
                              danger: true,
                              onSelect: () => onDelete(entry, item),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {editingItem && (
        <ItemEditDialog
          item={editingItem}
          categories={categories}
          stores={stores}
          storeIds={itemStores
            .filter((link) => link.item_id === editingItem.id)
            .map((link) => link.store_id)}
          brands={brands.filter((b) => b.item_id === editingItem.id)}
          onSaved={() => {
            setEditingItemId(null)
            onChanged?.()
          }}
          onClose={() => setEditingItemId(null)}
          onStoreAdded={onStoreAdded}
        />
      )}

      {photo && <PhotoViewer src={photo.src} alt={photo.alt} onClose={() => setPhoto(null)} />}
    </div>
  )
}
