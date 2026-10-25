import { useState } from 'react'
import ItemEditForm from './ItemEditForm'
import NewItemDialog from './NewItemDialog'
import CategoryManager from './CategoryManager'
import { createItem } from '../utils/items'
import { formatRelativeTime } from '../utils/time'

export default function CatalogView({
  items,
  categories,
  itemStores,
  brands,
  stores,
  onChanged,
  onStoreAdded,
}) {
  const [editingId, setEditingId] = useState(null) // item id, or null
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [managingCategories, setManagingCategories] = useState(false)

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))

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

  // Called by the dialog; returns an error message, or nothing on success.
  async function handleCreate(details) {
    const { error } = await createItem(details, categories)
    if (error) return error
    setCreating(false)
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
        <button onClick={() => setCreating(true)}>+ New item</button>
      </div>
      <button
        type="button"
        className="link-button catalog-manage-toggle"
        onClick={() => setManagingCategories(true)}
      >
        Manage categories
      </button>

      {managingCategories && (
        <CategoryManager
          categories={categories}
          items={items}
          onChanged={onChanged}
          onClose={() => setManagingCategories(false)}
        />
      )}

      {creating && (
        <NewItemDialog
          initialName={search.trim()}
          items={items}
          categories={categories}
          stores={stores}
          submitLabel="Save item"
          onSave={handleCreate}
          onClose={() => setCreating(false)}
          onStoreAdded={onStoreAdded}
        />
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
              <span className="item-category">
                {categoriesById[item.category_id]?.name || 'uncategorized'}
              </span>
            </button>

            {editingId === item.id && (
              <div className="catalog-edit-panel">
                <ItemEditForm
                  item={item}
                  categories={categories}
                  stores={stores}
                  storeIds={storeIdsFor(item.id)}
                  brands={brandsFor(item.id)}
                  onSaved={handleSaved}
                  onCancel={() => setEditingId(null)}
                  onStoreAdded={onStoreAdded}
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
