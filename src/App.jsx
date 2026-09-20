import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, HOUSEHOLD_ID } from './supabaseClient'
import StoreFilter from './components/StoreFilter'
import ItemList from './components/ItemList'
import AddItemForm from './components/AddItemForm'
import CatalogView from './components/CatalogView'
import BoughtView from './components/BoughtView'
import UndoToast from './components/UndoToast'

export default function App() {
  const [stores, setStores] = useState([])
  const [items, setItems] = useState([])
  const [itemStores, setItemStores] = useState([])
  const [brands, setBrands] = useState([])
  const [entries, setEntries] = useState([])
  const [members, setMembers] = useState([])
  const [activeStoreId, setActiveStoreId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'bought' | 'catalog'
  const [toast, setToast] = useState(null) // { message, undo }
  const toastTimeoutRef = useRef(null)

  const loadAll = useCallback(async () => {
    const [storesRes, itemsRes, itemStoresRes, brandsRes, entriesRes, membersRes] =
      await Promise.all([
        supabase.from('stores').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('items').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('item_stores').select('*'),
        supabase.from('item_brands').select('*'),
        supabase
          .from('list_entries')
          .select('*')
          .eq('household_id', HOUSEHOLD_ID)
          .order('created_at', { ascending: false }),
        supabase.from('members').select('*').eq('household_id', HOUSEHOLD_ID),
      ])

    setStores(storesRes.data || [])
    setItems(itemsRes.data || [])
    setItemStores(itemStoresRes.data || [])
    setBrands(brandsRes.data || [])
    setEntries(entriesRes.data || [])
    setMembers(membersRes.data || [])
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
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [loadAll])

  function showToast(message, undo) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ message, undo })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 6000)
  }

  function dismissToast() {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(null)
  }

  // Keeps items.last_bought_at accurate after an undo or a permanent
  // delete of a purchase record, by looking at what's actually left.
  async function recomputeLastBought(itemId) {
    const { data } = await supabase
      .from('list_entries')
      .select('bought_at')
      .eq('item_id', itemId)
      .eq('status', 'got')
      .order('bought_at', { ascending: false })
      .limit(1)
    await supabase
      .from('items')
      .update({ last_bought_at: data?.[0]?.bought_at || null })
      .eq('id', itemId)
  }

  async function handleMarkBought(entry, item) {
    const now = new Date().toISOString()
    await supabase
      .from('list_entries')
      .update({ status: 'got', bought_at: now })
      .eq('id', entry.id)
    if (item) {
      await supabase.from('items').update({ last_bought_at: now }).eq('id', item.id)
    }
    await loadAll()
    showToast(`Marked "${item?.name}" as bought`, async () => {
      await supabase
        .from('list_entries')
        .update({ status: 'needed', bought_at: null })
        .eq('id', entry.id)
      if (item) await recomputeLastBought(item.id)
      await loadAll()
    })
  }

  async function handleDeleteEntry(entry, item) {
    await supabase.from('list_entries').delete().eq('id', entry.id)
    await loadAll()
    showToast(`Removed "${item?.name}" from the list`, async () => {
      await supabase.from('list_entries').insert({
        household_id: HOUSEHOLD_ID,
        item_id: entry.item_id,
        quantity: entry.quantity,
        note: entry.note,
        added_by: entry.added_by,
        status: 'needed',
      })
      await loadAll()
    })
  }

  async function handleMoveBack(entry) {
    await supabase
      .from('list_entries')
      .update({ status: 'needed', bought_at: null })
      .eq('id', entry.id)
    await recomputeLastBought(entry.item_id)
    await loadAll()
  }

  async function handleDeleteForever(entry) {
    const item = items.find((i) => i.id === entry.item_id)
    const confirmed = confirm(
      `Permanently delete this purchase record${item ? ` for "${item.name}"` : ''}? This can't be undone.`,
    )
    if (!confirmed) return
    await supabase.from('list_entries').delete().eq('id', entry.id)
    await recomputeLastBought(entry.item_id)
    await loadAll()
  }

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
            className={view === 'bought' ? 'tab active' : 'tab'}
            onClick={() => setView('bought')}
          >
            Bought
          </button>
          <button
            className={view === 'catalog' ? 'tab active' : 'tab'}
            onClick={() => setView('catalog')}
          >
            Catalog
          </button>
        </nav>
      </header>

      {view === 'list' && (
        <>
          <StoreFilter
            stores={stores}
            activeStoreId={activeStoreId}
            onChange={setActiveStoreId}
          />

          <AddItemForm items={items} stores={stores} members={members} onAdded={loadAll} />

          <ItemList
            entries={entries}
            items={items}
            itemStores={itemStores}
            brands={brands}
            members={members}
            activeStoreId={activeStoreId}
            onMarkBought={handleMarkBought}
            onDelete={handleDeleteEntry}
          />
        </>
      )}

      {view === 'bought' && (
        <BoughtView
          entries={entries}
          items={items}
          members={members}
          onMoveBack={handleMoveBack}
          onDeleteForever={handleDeleteForever}
        />
      )}

      {view === 'catalog' && (
        <CatalogView
          items={items}
          itemStores={itemStores}
          brands={brands}
          stores={stores}
          onChanged={loadAll}
        />
      )}

      <UndoToast
        message={toast?.message}
        onUndo={() => toast?.undo?.()}
        onDismiss={dismissToast}
      />
    </div>
  )
}
