import { useState } from 'react'
import ItemEditForm from './ItemEditForm'
import { formatRelativeTime } from '../utils/time'

export default function CatalogView({ items, itemStores, brands, stores, onChanged }) {
  const [editingId, setEditingId] = useState(null) // item id, or 'new', or null
  const [search, setSearch] = useState('')

  const filtered = items
    .filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  function storeIdsFor(itemId) {
    return itemStores.filter((l) => l.item_id === itemId).map((l) => l.store_id)
  }

  function brandsFor(itemId) {
    return brands.filter((b) => b.item_id === itemId)
  }

  function handleSaved() {
    setEditingId(null)
    onChanged()
  }

  return (
    <div className="catalog-view">
      <div className="catalog-header">
        <input
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => setEditingId('new')}>+ New item</button>
      </div>

      {editingId === 'new' && (
        <div className="catalog-edit-panel">
          <ItemEditForm
            stores={stores}
            storeIds={[]}
            brands={[]}
            onSaved={handleSaved}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      <div className="catalog-list">
        {filtered.map((item) => (
          <div key={item.id} className="catalog-row">
            <button
              className="catalog-row-header"
              onClick={() => setEditingId(editingId === item.id ? null : item.id)}
            >
              <span className="catalog-row-title">
                <span className="item-name">{item.name}</span>
                {item.last_bought_at && (
                  <span className="last-bought-inline">
                    last bought {formatRelativeTime(item.last_bought_at)}
                  </span>
                )}
              </span>
              <span className="item-category">{item.category}</span>
            </button>

            {editingId === item.id && (
              <div className="catalog-edit-panel">
                <ItemEditForm
                  item={item}
                  stores={stores}
                  storeIds={storeIdsFor(item.id)}
                  brands={brandsFor(item.id)}
                  onSaved={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="empty-state">No items match that search.</p>}
      </div>
    </div>
  )
}
