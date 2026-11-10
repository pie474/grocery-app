import { useState } from 'react'
import ItemEditForm from './ItemEditForm'
import NewItemDialog from './NewItemDialog'
import CategoryManager from './CategoryManager'
import { createItem } from '../utils/items'
import { formatRelativeTime } from '../utils/time'
import { searchByName } from '../utils/search'
import EmptyState from './EmptyState'

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

  const filtered = search.trim()
    ? searchByName(items, search)
    : [...items].sort((a, b) => a.name.localeCompare(b.name))

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
        <div className="catalog-search-row">
          <input
            type="search"
            placeholder="Search items…"
            aria-label="Search items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="catalog-new-button" onClick={() => setCreating(true)}>
            + New item
          </button>
        </div>
        <div className="catalog-toolbar">
          <span className="catalog-count">
            {items.length === 1 ? '1 item' : `${items.length} items`}
          </span>
          <button
            type="button"
            className="catalog-manage-toggle"
            onClick={() => setManagingCategories(true)}
          >
            {/* tag */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
              <circle cx="8" cy="8" r="1.5" />
            </svg>
            Manage categories
          </button>
        </div>
      </div>

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
              <span className={categoriesById[item.category_id] ? 'item-category' : 'item-category none'}>
                {categoriesById[item.category_id]?.name || 'Uncategorized'}
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
        {!filtered.length &&
          (search.trim() ? (
            <EmptyState
              icon="search"
              title={`No items match "${search.trim()}"`}
              hint="Check the spelling, or add it to the catalog."
              actionLabel={`Create "${search.trim()}"`}
              onAction={() => setCreating(true)}
            />
          ) : (
            <EmptyState
              icon="catalog"
              title="No items yet"
              hint="Everything you add to the list is saved here, with its stores, brands and tips."
              actionLabel="+ New item"
              onAction={() => setCreating(true)}
            />
          ))}
      </div>
    </div>
  )
}
