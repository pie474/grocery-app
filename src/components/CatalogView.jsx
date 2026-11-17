import { useEffect, useRef, useState } from 'react'
import ItemEditDialog from './ItemEditDialog'
import NewItemDialog from './NewItemDialog'
import CategoryManager from './CategoryManager'
import { createItem, sortCategories } from '../utils/items'
import { formatRelativeTime } from '../utils/time'
import { searchByName } from '../utils/search'
import EmptyState from './EmptyState'

// filter values; real ids are uuids, so these can't clash with one
const ALL = ''
const UNCATEGORIZED = 'none'

function itemCount(count) {
  return count === 1 ? '1 item' : `${count} items`
}

// Keeps the search row stuck right under the app header, whatever height
// the header has (it changes with the safe-area inset and its own
// styles): measures the header and hands the number to CSS as
// --catalog-sticky-top on the catalog's own container.
function useStickyTop(containerRef) {
  useEffect(() => {
    const header = document.querySelector('.app-header')
    const container = containerRef.current
    if (!header || !container) return
    const update = () =>
      container.style.setProperty('--catalog-sticky-top', `${header.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [containerRef])
}

// The right-hand end of a catalog row: a "+" that puts the item on the
// list, or a quiet "On list" once it's there.
function AddToListButton({ item, onList, adding, onAdd }) {
  if (onList) {
    return (
      <span className="catalog-on-list">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        On list
      </span>
    )
  }
  return (
    <button
      type="button"
      className="catalog-add-button"
      aria-label={`Add ${item.name} to the list`}
      disabled={adding}
      onClick={() => onAdd(item)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

export default function CatalogView({
  items,
  categories,
  itemStores,
  brands,
  stores,
  entries = [],
  onAddToList,
  onChanged,
  onStoreAdded,
}) {
  const containerRef = useRef(null)
  const [editingId, setEditingId] = useState(null) // item id, or null
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL) // id, UNCATEGORIZED or ALL
  const [storeFilter, setStoreFilter] = useState(ALL) // store id or ALL
  const [managingCategories, setManagingCategories] = useState(false)
  // item ids being added right now, so a quick second tap doesn't add twice
  const [adding, setAdding] = useState([])

  useStickyTop(containerRef)

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const storesById = Object.fromEntries(stores.map((s) => [s.id, s]))
  const sortedCategories = sortCategories(categories)
  const sortedStores = [...stores].sort((a, b) => a.name.localeCompare(b.name))
  const onList = new Set(entries.filter((e) => e.status === 'needed').map((e) => e.item_id))
  const hasUncategorized = items.some((i) => !categoriesById[i.category_id])

  // store ids per item, looked up once rather than per row
  const storeIdsByItem = {}
  for (const link of itemStores) {
    storeIdsByItem[link.item_id] = [...(storeIdsByItem[link.item_id] || []), link.store_id]
  }
  const brandsByItem = {}
  for (const brand of brands) {
    brandsByItem[brand.item_id] = [...(brandsByItem[brand.item_id] || []), brand]
  }

  // A filter whose category or store has since been deleted (here or on
  // another phone) counts as "all" rather than hiding everything.
  const activeCategory =
    categoryFilter === UNCATEGORIZED
      ? UNCATEGORIZED
      : categoriesById[categoryFilter]
        ? categoryFilter
        : ALL
  const activeStore = storesById[storeFilter] ? storeFilter : ALL
  const filtering = activeCategory !== ALL || activeStore !== ALL

  const query = search.trim()
  const filtered = (
    query ? searchByName(items, query) : [...items].sort((a, b) => a.name.localeCompare(b.name))
  ).filter((item) => {
    if (activeCategory === UNCATEGORIZED && categoriesById[item.category_id]) return false
    if (activeCategory !== ALL && activeCategory !== UNCATEGORIZED && item.category_id !== activeCategory)
      return false
    if (activeStore !== ALL && !(storeIdsByItem[item.id] || []).includes(activeStore)) return false
    return true
  })

  function clearFilters() {
    setCategoryFilter(ALL)
    setStoreFilter(ALL)
  }

  async function handleAdd(item) {
    setAdding((prev) => [...prev, item.id])
    // App shows the "Added … to the list" toast, with Undo
    await onAddToList([{ item }])
    setAdding((prev) => prev.filter((id) => id !== item.id))
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

  // "in Dairy at Costco", for the empty state when filters match nothing
  function filterDescription() {
    const parts = []
    if (activeCategory === UNCATEGORIZED) parts.push('uncategorized')
    else if (activeCategory !== ALL) parts.push(`in ${categoriesById[activeCategory].name}`)
    if (activeStore !== ALL) parts.push(`at ${storesById[activeStore].name}`)
    return parts.join(' ')
  }

  function emptyState() {
    if (filtering) {
      const description = filterDescription()
      const what = query ? `items matching "${query}"` : 'items'
      // "No uncategorized items", but "No items in Dairy"
      const title =
        activeCategory === UNCATEGORIZED
          ? `No uncategorized ${what}${activeStore !== ALL ? ` at ${storesById[activeStore].name}` : ''}`
          : `No ${what} ${description}`
      return (
        <EmptyState
          icon="search"
          title={title}
          hint="Try another category or store, or show everything."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      )
    }
    if (query) {
      return (
        <EmptyState
          icon="search"
          title={`No items match "${query}"`}
          hint="Check the spelling, or add it to the catalog."
          actionLabel={`Create "${query}"`}
          onAction={() => setCreating(true)}
        />
      )
    }
    return (
      <EmptyState
        icon="catalog"
        title="No items yet"
        hint="Everything you add to the list is saved here, with its stores, brands and tips."
        actionLabel="+ New item"
        onAction={() => setCreating(true)}
      />
    )
  }

  return (
    <div className="catalog-view" ref={containerRef}>
      {/* stays under the app header while the list scrolls */}
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

      <div className="catalog-header">
        {items.length > 0 && (categories.length > 0 || stores.length > 0) && (
          // native selects: the phone's own picker, reliable and familiar
          <div className="catalog-filters">
            {(categories.length > 0 || hasUncategorized) && (
              <select
                aria-label="Show category"
                className={activeCategory !== ALL ? 'active' : undefined}
                value={activeCategory}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value={ALL}>All categories</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {hasUncategorized && <option value={UNCATEGORIZED}>Uncategorized</option>}
              </select>
            )}
            {stores.length > 0 && (
              <select
                aria-label="Show store"
                className={activeStore !== ALL ? 'active' : undefined}
                value={activeStore}
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <option value={ALL}>All stores</option>
                {sortedStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="catalog-toolbar">
          <span className="catalog-count" aria-live="polite">
            {/* what's showing: everything, or what the search and filters leave */}
            {query || filtering
              ? `${filtered.length} of ${itemCount(items.length)}`
              : itemCount(filtered.length)}
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
          initialName={query}
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
        {filtered.map((item) => {
          const itemBrands = brandsByItem[item.id] || []
          // same pick as ItemDetail: the preferred brand, else the first
          const preferred = itemBrands.find((b) => b.is_preferred) || itemBrands[0]
          // the item's own photo, else its brand's packaging
          const photo = item.image_url || preferred?.image_url
          const category = categoriesById[item.category_id]
          const storeNames = (storeIdsByItem[item.id] || [])
            .map((id) => storesById[id]?.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
            .join(', ')
          const lastBought = item.last_bought_at && formatRelativeTime(item.last_bought_at)

          return (
            <div key={item.id} className="catalog-row">
              {/* the row opens the editor; the add button is its sibling,
                  not inside it, so the two never nest */}
              <button
                type="button"
                className="catalog-row-header"
                onClick={() => setEditingId(item.id)}
              >
                {photo && (
                  <img
                    className="catalog-row-photo"
                    src={photo}
                    alt=""
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <span className="catalog-row-text">
                  <span className="catalog-row-title">
                    <span className="item-name">{item.name}</span>
                    <span className={category ? 'item-category' : 'item-category none'}>
                      {category?.name || 'Uncategorized'}
                    </span>
                  </span>
                  {(storeNames || lastBought) && (
                    <span className="catalog-row-meta">
                      {storeNames && <span className="catalog-row-stores">{storeNames}</span>}
                      {storeNames && lastBought && (
                        <span className="catalog-row-sep" aria-hidden="true">·</span>
                      )}
                      {lastBought && (
                        <span className="catalog-row-last-bought">last bought {lastBought}</span>
                      )}
                    </span>
                  )}
                </span>
              </button>
              <AddToListButton
                item={item}
                onList={onList.has(item.id)}
                adding={adding.includes(item.id)}
                onAdd={handleAdd}
              />

              {editingId === item.id && (
                <ItemEditDialog
                  item={item}
                  categories={categories}
                  stores={stores}
                  storeIds={storeIdsByItem[item.id] || []}
                  brands={itemBrands}
                  onSaved={handleSaved}
                  onClose={() => setEditingId(null)}
                  onStoreAdded={onStoreAdded}
                />
              )}
            </div>
          )
        })}
        {!filtered.length && emptyState()}
      </div>
    </div>
  )
}
