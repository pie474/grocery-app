import { useEffect, useState, useCallback } from 'react'
import { supabase, HOUSEHOLD_ID } from './supabaseClient'
import StoreFilter from './components/StoreFilter'
import ItemList from './components/ItemList'
import AddItemForm from './components/AddItemForm'
import CatalogView from './components/CatalogView'

export default function App() {
  const [stores, setStores] = useState([])
  const [items, setItems] = useState([])
  const [itemStores, setItemStores] = useState([])
  const [brands, setBrands] = useState([])
  const [entries, setEntries] = useState([])
  const [activeStoreId, setActiveStoreId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'catalog'

  const loadAll = useCallback(async () => {
    const [storesRes, itemsRes, itemStoresRes, brandsRes, entriesRes] = await Promise.all([
      supabase.from('stores').select('*').eq('household_id', HOUSEHOLD_ID),
      supabase.from('items').select('*').eq('household_id', HOUSEHOLD_ID),
      supabase.from('item_stores').select('*'),
      supabase.from('item_brands').select('*'),
      supabase
        .from('list_entries')
        .select('*')
        .eq('household_id', HOUSEHOLD_ID)
        .order('created_at', { ascending: false }),
    ])

    setStores(storesRes.data || [])
    setItems(itemsRes.data || [])
    setItemStores(itemStoresRes.data || [])
    setBrands(brandsRes.data || [])
    setEntries(entriesRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()

    // Realtime: any family member's change to the shared list shows up
    // here within a second or two, no polling.
    const channel = supabase
      .channel('household-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_entries' },
        () => loadAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => loadAll(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadAll])

  if (loading) return <p className="loading">Loading…</p>

  return (
    <div className="app">
      <header>
        <h1>Grocery List</h1>
        <nav className="view-tabs">
          <button
            className={view === 'list' ? 'tab active' : 'tab'}
            onClick={() => setView('list')}
          >
            List
          </button>
          <button
            className={view === 'catalog' ? 'tab active' : 'tab'}
            onClick={() => setView('catalog')}
          >
            Catalog
          </button>
        </nav>
      </header>

      {view === 'list' ? (
        <>
          <StoreFilter
            stores={stores}
            activeStoreId={activeStoreId}
            onChange={setActiveStoreId}
          />

          <AddItemForm items={items} stores={stores} onAdded={loadAll} />

          <ItemList
            entries={entries}
            items={items}
            itemStores={itemStores}
            brands={brands}
            activeStoreId={activeStoreId}
          />
        </>
      ) : (
        <CatalogView
          items={items}
          itemStores={itemStores}
          brands={brands}
          stores={stores}
          onChanged={loadAll}
        />
      )}
    </div>
  )
}
