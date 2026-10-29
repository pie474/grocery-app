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
  const [categories, setCategories] = useState([])
  const [itemStores, setItemStores] = useState([])
  const [brands, setBrands] = useState([])
  const [entries, setEntries] = useState([])
  const [members, setMembers] = useState([])
  const [activeStoreId, setActiveStoreId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'bought' | 'catalog'
  const [toast, setToast] = useState(null) // { message, undo }
  const toastTimeoutRef = useRef(null)

  const loadAll = useCallback(async () => {
    const results = await Promise.all([
        supabase.from('stores').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('items').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('categories').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('item_stores').select('*'),
        supabase.from('item_brands').select('*'),
        supabase
          .from('list_entries')
          .select('*')
          .eq('household_id', HOUSEHOLD_ID)
          .order('created_at', { ascending: false }),
        supabase.from('members').select('*').eq('household_id', HOUSEHOLD_ID),
      ])

    const failed = results.find((res) => res.error)
    if (failed) {
      // Keep whatever is already on screen rather than blanking the list
      // on a flaky connection.
      console.error(failed.error)
      setLoadError(true)
      setLoading(false)
      return
    }

    const [
      storesRes,
      itemsRes,
      categoriesRes,
      itemStoresRes,
      brandsRes,
      entriesRes,
      membersRes,
    ] = results
    setStores(storesRes.data || [])
    setItems(itemsRes.data || [])
    setCategories(categoriesRes.data || [])
    setItemStores(itemStoresRes.data || [])
    setBrands(brandsRes.data || [])
    setEntries(entriesRes.data || [])
    setMembers(membersRes.data || [])
    setLoadError(false)
    setHasLoaded(true)
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stores' },
        () => loadAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => loadAll(),
      )
      .subscribe()

    // catch up on anything missed while the phone had no signal
    window.addEventListener('online', loadAll)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', loadAll)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [loadAll])

  // undo: a function for an Undo button, or null for a plain message.
  function showToast(message, undo, { error = false } = {}) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ message, undo, error })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 6000)
  }

  function showError(message) {
    showToast(message, null, { error: true })
  }

  function dismissToast() {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast(null)
  }

  // Local edits so the screen updates on tap instead of after a round
  // trip. Each handler below puts things back if the save fails.
  function patchEntry(entryId, changes) {
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...changes } : e)))
  }

  function patchItem(itemId, changes) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...changes } : i)))
  }

  function restoreEntry(entry) {
    setEntries((prev) =>
      [...prev.filter((e) => e.id !== entry.id), entry].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ),
    )
  }

  function removeEntryLocally(entryId) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  // Keeps items.last_bought_at accurate after an undo or a permanent
  // delete of a purchase record, by looking at what's actually left.
  async function recomputeLastBought(itemId) {
    const { data, error } = await supabase
      .from('list_entries')
      .select('bought_at')
      .eq('item_id', itemId)
      .eq('status', 'got')
      .order('bought_at', { ascending: false })
      .limit(1)
    if (error) {
      console.error(error)
      return
    }
    const lastBoughtAt = data?.[0]?.bought_at || null
    patchItem(itemId, { last_bought_at: lastBoughtAt })
    await supabase.from('items').update({ last_bought_at: lastBoughtAt }).eq('id', itemId)
  }

  function handleMarkBought(entry, item) {
    const now = new Date().toISOString()
    const name = item?.name || 'item'
    patchEntry(entry.id, { status: 'got', bought_at: now })
    if (item) patchItem(item.id, { last_bought_at: now })

    // Resolves to whether the save worked, so Undo can wait for it
    // instead of racing it.
    const saved = (async () => {
      const { error } = await supabase
        .from('list_entries')
        .update({ status: 'got', bought_at: now })
        .eq('id', entry.id)
      if (error) {
        console.error(error)
        patchEntry(entry.id, { status: entry.status, bought_at: entry.bought_at })
        if (item) patchItem(item.id, { last_bought_at: item.last_bought_at })
        showError(`Couldn't mark "${name}" as bought. Check your connection and try again.`)
        return false
      }
      if (item) {
        const { error: itemError } = await supabase
          .from('items')
          .update({ last_bought_at: now })
          .eq('id', item.id)
        if (itemError) console.error(itemError)
      }
      return true
    })()

    showToast(`Marked "${name}" as bought`, async () => {
      if (!(await saved)) return
      patchEntry(entry.id, { status: 'needed', bought_at: null })
      if (item) patchItem(item.id, { last_bought_at: item.last_bought_at })
      const { error } = await supabase
        .from('list_entries')
        .update({ status: 'needed', bought_at: null })
        .eq('id', entry.id)
      if (error) {
        console.error(error)
        patchEntry(entry.id, { status: 'got', bought_at: now })
        if (item) patchItem(item.id, { last_bought_at: now })
        showError(`Couldn't undo. "${name}" is still marked as bought.`)
        return
      }
      if (item) await recomputeLastBought(item.id)
    })
  }

  function handleDeleteEntry(entry, item) {
    const name = item?.name || 'item'
    removeEntryLocally(entry.id)

    const deleted = (async () => {
      const { error } = await supabase.from('list_entries').delete().eq('id', entry.id)
      if (error) {
        console.error(error)
        restoreEntry(entry)
        showError(`Couldn't remove "${name}". Check your connection and try again.`)
        return false
      }
      return true
    })()

    showToast(`Removed "${name}" from the list`, async () => {
      if (!(await deleted)) return
      restoreEntry(entry)
      // same id and created_at, so it comes back exactly where it was
      const { error } = await supabase.from('list_entries').insert(entry)
      if (error) {
        console.error(error)
        removeEntryLocally(entry.id)
        showError(`Couldn't undo. "${name}" is still removed.`)
      }
    })
  }

  function countLabel(count) {
    return count === 1 ? 'this purchase record' : `these ${count} purchase records`
  }

  // The Bought tab's actions take a list of entries so a single row and a
  // multi-select batch share one path. Each updates the screen right
  // away and returns false only if the user backed out at the confirm.
  function handleMoveBack(selected) {
    const ids = selected.map((e) => e.id)
    setEntries((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, status: 'needed', bought_at: null } : e)),
    )
    saveInBackground(
      () => supabase.from('list_entries').update({ status: 'needed', bought_at: null }).in('id', ids),
      selected,
      selected.length === 1
        ? "Couldn't move it back to the list. Check your connection and try again."
        : "Couldn't move them back to the list. Check your connection and try again.",
    )
    return true
  }

  function handleDeleteForever(selected) {
    const item = selected.length === 1 && items.find((i) => i.id === selected[0].item_id)
    const confirmed = confirm(
      `Permanently delete ${countLabel(selected.length)}${item ? ` for "${item.name}"` : ''}? This can't be undone.`,
    )
    if (!confirmed) return false
    const ids = selected.map((e) => e.id)
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
    saveInBackground(
      () => supabase.from('list_entries').delete().in('id', ids),
      selected,
      "Couldn't delete. Check your connection and try again.",
    )
    return true
  }

  // Runs a save after the screen has already been updated; on failure
  // puts the entries back as they were and says so.
  async function saveInBackground(save, originals, errorMessage) {
    const { error } = await save()
    if (error) {
      console.error(error)
      originals.forEach(restoreEntry)
      showError(errorMessage)
      return
    }
    await Promise.all([...new Set(originals.map((e) => e.item_id))].map(recomputeLastBought))
  }

  function retryLoad() {
    setLoading(true)
    loadAll()
  }

  if (loading) return <p className="loading">Loading…</p>

  if (!hasLoaded) {
    return (
      <div className="load-error" role="alert">
        <p>Couldn't load the list. Check your connection.</p>
        <button type="button" onClick={retryLoad}>
          Try again
        </button>
      </div>
    )
  }

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

      {loadError && (
        <p className="sync-banner" role="alert">
          Couldn't refresh the list. You may be offline.{' '}
          <button type="button" className="link-button" onClick={loadAll}>
            Retry
          </button>
        </p>
      )}

      {view === 'list' && (
        <>
          <StoreFilter
            stores={stores}
            activeStoreId={activeStoreId}
            onChange={setActiveStoreId}
            onStoreAdded={loadAll}
          />

          <AddItemForm
            items={items}
            categories={categories}
            stores={stores}
            itemStores={itemStores}
            members={members}
            onAdded={loadAll}
            onStoreAdded={loadAll}
          />

          <ItemList
            entries={entries}
            items={items}
            categories={categories}
            itemStores={itemStores}
            brands={brands}
            members={members}
            activeStoreId={activeStoreId}
            onMarkBought={handleMarkBought}
            onDelete={handleDeleteEntry}
            onChanged={loadAll}
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
          categories={categories}
          itemStores={itemStores}
          brands={brands}
          stores={stores}
          onChanged={loadAll}
          onStoreAdded={loadAll}
        />
      )}

      <UndoToast
        message={toast?.message}
        error={toast?.error}
        onUndo={toast?.undo}
        onDismiss={dismissToast}
      />
    </div>
  )
}
