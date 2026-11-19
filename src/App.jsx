import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, HOUSEHOLD_ID } from './supabaseClient'
import StoreFilter from './components/StoreFilter'
import ItemList from './components/ItemList'
import AddItemForm from './components/AddItemForm'
import CatalogView from './components/CatalogView'
import BoughtView from './components/BoughtView'
import UndoToast from './components/UndoToast'
import StoreManager from './components/StoreManager'
import MemberPicker from './components/MemberPicker'
import MemberPrompt from './components/MemberPrompt'
import AppHeader from './components/AppHeader'
import BottomNav from './components/BottomNav'
import ListSkeleton from './components/ListSkeleton'
import useNewEntries from './hooks/useNewEntries'
import { isMissingTable } from './utils/items'
import {
  getDeviceMemberId,
  setDeviceMemberId,
  getMemberPromptDismissed,
  setMemberPromptDismissed,
} from './utils/members'

// header title for each view
const VIEW_TITLES = { list: 'Grocery List', bought: 'Bought', catalog: 'Catalog' }

// How many toasts show at once. Checking off a few items in a row keeps
// each one's Undo within reach; past this the oldest goes.
const MAX_TOASTS = 3

// list_entries fields for an entry that's back on the list
const NEEDED = { status: 'needed', bought_at: null, bought_by: null }

export default function App() {
  const [stores, setStores] = useState([])
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [itemStores, setItemStores] = useState([])
  const [brands, setBrands] = useState([])
  const [photos, setPhotos] = useState([]) // item_photos rows
  const [entries, setEntries] = useState([])
  const [members, setMembers] = useState([])
  const [activeStoreId, setActiveStoreId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'bought' | 'catalog'
  // "Not now" on the first-run "who's using this phone?" card
  const [memberPromptDismissed, setMemberPromptDismissedState] = useState(getMemberPromptDismissed)
  // [{ id, message, undo, error, actionLabel }], oldest first
  const [toasts, setToasts] = useState([])
  const [storeManagerOpen, setStoreManagerOpen] = useState(false)
  // who's using this phone: recorded as who added or bought things here
  const [deviceMemberId, setDeviceMemberIdState] = useState(getDeviceMemberId)
  // each toast's own timeout, by toast id
  const toastTimersRef = useRef(new Map())
  const toastIdRef = useRef(0)

  const loadAll = useCallback(async () => {
    const results = await Promise.all([
        supabase.from('stores').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('items').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('categories').select('*').eq('household_id', HOUSEHOLD_ID),
        supabase.from('item_stores').select('*'),
        supabase.from('item_brands').select('*'),
        supabase.from('item_photos').select('*'),
        supabase
          .from('list_entries')
          .select('*')
          .eq('household_id', HOUSEHOLD_ID)
          .order('created_at', { ascending: false }),
        supabase.from('members').select('*').eq('household_id', HOUSEHOLD_ID),
      ])

    // item_photos doesn't exist until migrations/005_item_photo.sql has
    // run; that just means no item has photos yet, not a failed load
    const failed = results.find((res) => res.error && !isMissingTable(res.error))
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
      photosRes,
      entriesRes,
      membersRes,
    ] = results
    setStores(storesRes.data || [])
    setItems(itemsRes.data || [])
    setCategories(categoriesRes.data || [])
    setItemStores(itemStoresRes.data || [])
    setBrands(brandsRes.data || [])
    setPhotos(photosRes.data || [])
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

    // ...or while the app was in the background. An installed PWA is
    // suspended when you switch away or lock the phone, and realtime
    // events sent meanwhile are lost; the socket can also take a while to
    // notice it's dead. So reload whenever the app comes back.
    function onVisibility() {
      if (document.visibilityState === 'visible') loadAll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', loadAll)
      document.removeEventListener('visibilitychange', onVisibility)
      toastTimersRef.current.forEach(clearTimeout)
    }
  }, [loadAll])

  function handleDeviceMemberChange(memberId) {
    setDeviceMemberIdState(memberId)
    setDeviceMemberId(memberId)
  }

  function dismissMemberPrompt() {
    setMemberPromptDismissedState(true)
    setMemberPromptDismissed()
  }

  // each tab starts at the top, not at the last tab's scroll position
  function changeView(next) {
    if (next === view) return
    setView(next)
    window.scrollTo(0, 0)
  }

  // ignores a remembered member who has since been removed
  const currentMemberId = members.some((m) => m.id === deviceMemberId) ? deviceMemberId : null
  const { isNew, dismiss: dismissNew } = useNewEntries(entries, hasLoaded, currentMemberId)
  const showMemberPrompt = members.length > 0 && !currentMemberId && !memberPromptDismissed

  // undo: a function for the toast's button (labelled "Undo", or
  // actionLabel), or null for a plain message. Each toast has its own
  // timer; errors stay up longer so there's time to read them.
  function showToast(message, undo, { error = false, actionLabel } = {}) {
    toastIdRef.current += 1
    const id = toastIdRef.current
    setToasts((prev) => {
      const next = [...prev, { id, message, undo, error, actionLabel }]
      next.slice(0, -MAX_TOASTS).forEach((t) => clearToastTimer(t.id))
      return next.slice(-MAX_TOASTS)
    })
    toastTimersRef.current.set(
      id,
      setTimeout(() => dismissToast(id), error ? 8000 : 6000),
    )
  }

  function showError(message) {
    showToast(message, null, { error: true })
  }

  function clearToastTimer(id) {
    clearTimeout(toastTimersRef.current.get(id))
    toastTimersRef.current.delete(id)
  }

  function dismissToast(id) {
    clearToastTimer(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // After the add form puts something on the list. Under a store filter
  // the new row only shows if the item is sold at that store; otherwise
  // say where it went, so the add doesn't look like it silently failed.
  function handleItemAdded({ name, storeIds }) {
    loadAll()
    if (!activeStoreId || storeIds.includes(activeStoreId)) return
    const storeName = stores.find((s) => s.id === activeStoreId)?.name || 'this store'
    showToast(
      `Added "${name}". It's not sold at ${storeName}, so it's under All items.`,
      () => setActiveStoreId(null),
      { actionLabel: 'Show all' },
    )
  }

  // a deleted store can't stay the filter
  function handleStoreDeleted(store) {
    if (store.id === activeStoreId) setActiveStoreId(null)
    loadAll()
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
    const bought = { status: 'got', bought_at: now, bought_by: currentMemberId }
    patchEntry(entry.id, bought)
    if (item) patchItem(item.id, { last_bought_at: now })

    // Resolves to whether the save worked, so Undo can wait for it
    // instead of racing it.
    const saved = (async () => {
      const { error } = await supabase
        .from('list_entries')
        .update(bought)
        .eq('id', entry.id)
      if (error) {
        console.error(error)
        patchEntry(entry.id, {
          status: entry.status,
          bought_at: entry.bought_at,
          bought_by: entry.bought_by,
        })
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
      patchEntry(entry.id, NEEDED)
      if (item) patchItem(item.id, { last_bought_at: item.last_bought_at })
      const { error } = await supabase.from('list_entries').update(NEEDED).eq('id', entry.id)
      if (error) {
        console.error(error)
        patchEntry(entry.id, bought)
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

  // What a Bought-tab action applied to, for its toast: the item's name
  // for one entry, otherwise a count.
  function countLabel(selected, noun) {
    if (selected.length === 1) {
      const item = items.find((i) => i.id === selected[0].item_id)
      return `"${item?.name || 'item'}"`
    }
    return `${selected.length} ${noun}`
  }

  // The Bought tab's actions take a list of entries so a single row and a
  // multi-select batch share one path. Both update the screen right away
  // and offer Undo rather than asking first, so they always go ahead and
  // return true (BoughtView leaves select mode on true).
  function handleMoveBack(selected) {
    const ids = selected.map((e) => e.id)
    setEntries((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, ...NEEDED } : e)),
    )
    const saved = saveInBackground(
      () => supabase.from('list_entries').update(NEEDED).in('id', ids),
      selected,
      selected.length === 1
        ? "Couldn't move it back to the list. Check your connection and try again."
        : "Couldn't move them back to the list. Check your connection and try again.",
    )

    showToast(`Moved ${countLabel(selected, 'items')} back to the list`, async () => {
      if (!(await saved)) return
      selected.forEach(restoreEntry)
      // each entry has its own bought_at, so they're saved one by one
      const results = await Promise.all(
        selected.map((e) =>
          supabase
            .from('list_entries')
            .update({ status: e.status, bought_at: e.bought_at, bought_by: e.bought_by })
            .eq('id', e.id),
        ),
      )
      const failed = selected.filter((e, i) => results[i].error)
      if (failed.length) {
        console.error(results.find((r) => r.error).error)
        failed.forEach((e) => patchEntry(e.id, NEEDED))
        showError(
          failed.length === 1
            ? "Couldn't undo. It's still back on the list."
            : `Couldn't undo ${failed.length} of them. They're still back on the list.`,
        )
      }
      await recomputeLastBoughtFor(selected)
    })
    return true
  }

  function handleDeleteForever(selected) {
    const ids = selected.map((e) => e.id)
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
    const deleted = saveInBackground(
      () => supabase.from('list_entries').delete().in('id', ids),
      selected,
      "Couldn't delete. Check your connection and try again.",
    )

    showToast(`Deleted ${countLabel(selected, 'purchase records')}`, async () => {
      if (!(await deleted)) return
      selected.forEach(restoreEntry)
      // same ids and timestamps, so they come back exactly as they were
      const { error } = await supabase.from('list_entries').insert(selected)
      if (error) {
        console.error(error)
        setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
        showError("Couldn't undo. Still deleted.")
        return
      }
      await recomputeLastBoughtFor(selected)
    })
    return true
  }

  // Puts catalog items on the list as new entries: "Add to list" in the
  // Catalog tab and "Buy again" in the Bought tab. requests is a list of
  // { item, quantity? }. Resolves to whether it worked.
  async function handleAddToList(requests) {
    if (!requests.length) return false
    const rows = requests.map(({ item, quantity = null }) => ({
      household_id: HOUSEHOLD_ID,
      item_id: item.id,
      status: 'needed',
      quantity,
      note: null,
      added_by: currentMemberId,
    }))
    const label =
      requests.length === 1 ? `"${requests[0].item.name}"` : `${requests.length} items`
    const { data, error } = await supabase.from('list_entries').insert(rows).select()
    if (error) {
      console.error(error)
      showError(`Couldn't add ${label} to the list. Check your connection and try again.`)
      return false
    }
    const added = data || []
    const ids = added.map((e) => e.id)
    setEntries((prev) => [...added, ...prev.filter((e) => !ids.includes(e.id))])
    showToast(`Added ${label} to the list`, async () => {
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
      const { error: undoError } = await supabase.from('list_entries').delete().in('id', ids)
      if (undoError) {
        console.error(undoError)
        added.forEach(restoreEntry)
        showError(`Couldn't undo. ${label} is still on the list.`)
      }
    })
    return true
  }

  function recomputeLastBoughtFor(affected) {
    return Promise.all([...new Set(affected.map((e) => e.item_id))].map(recomputeLastBought))
  }

  // Runs a save after the screen has already been updated; on failure
  // puts the entries back as they were and says so. Resolves to whether
  // it worked, so Undo can wait for it instead of racing it.
  async function saveInBackground(save, originals, errorMessage) {
    const { error } = await save()
    if (error) {
      console.error(error)
      originals.forEach(restoreEntry)
      showError(errorMessage)
      return false
    }
    await recomputeLastBoughtFor(originals)
    return true
  }

  function retryLoad() {
    setLoading(true)
    loadAll()
  }

  if (loading) return <ListSkeleton />

  if (!hasLoaded) {
    return (
      <div className="load-error" role="alert">
        <span className="load-error-icon" aria-hidden="true">
          {/* cloud with a line through it */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 18h10.5a3.5 3.5 0 0 0 .6-6.95A6 6 0 0 0 6.6 9.2 4.5 4.5 0 0 0 7 18z" />
            <path d="M4 4l16 16" />
          </svg>
        </span>
        <h1 className="load-error-title">Couldn't load your list</h1>
        <p className="load-error-text">
          Check that you're connected to the internet, then try again. Nothing you added
          before has been lost.
        </p>
        <button type="button" onClick={retryLoad}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      <AppHeader title={VIEW_TITLES[view]}>
        {/* while the first-run card is up it does the asking instead */}
        {members.length > 0 && !showMemberPrompt && (
          <MemberPicker
            members={members}
            memberId={currentMemberId}
            onChange={handleDeviceMemberChange}
          />
        )}
      </AppHeader>

      {/* straight after the header on the List tab: it sticks under it,
          and the two read as one block */}
      {view === 'list' && (
        <StoreFilter
          stores={stores}
          entries={entries}
          itemStores={itemStores}
          activeStoreId={activeStoreId}
          onChange={setActiveStoreId}
          onEditStores={() => setStoreManagerOpen(true)}
        />
      )}

      {loadError && (
        <div className="sync-banner" role="alert">
          <svg className="sync-banner-icon" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5l9.5 16.5h-19z" />
            <path d="M12 10v4.5M12 17.5v.01" />
          </svg>
          <p className="sync-banner-text">Couldn't refresh. You may be offline; this list might be out of date.</p>
          <button type="button" className="sync-banner-retry" onClick={loadAll}>
            Retry
          </button>
        </div>
      )}

      {showMemberPrompt && (
        <MemberPrompt
          members={members}
          onChoose={handleDeviceMemberChange}
          onDismiss={dismissMemberPrompt}
        />
      )}

      {view === 'list' && (
        <>
          <AddItemForm
            items={items}
            categories={categories}
            stores={stores}
            itemStores={itemStores}
            entries={entries}
            activeStoreId={activeStoreId}
            addedBy={currentMemberId}
            onAdded={handleItemAdded}
            onStoreAdded={loadAll}
          />

          <ItemList
            entries={entries}
            items={items}
            categories={categories}
            itemStores={itemStores}
            brands={brands}
            photos={photos}
            stores={stores}
            members={members}
            activeStoreId={activeStoreId}
            onClearStore={() => setActiveStoreId(null)}
            onMarkBought={handleMarkBought}
            onDelete={handleDeleteEntry}
            isNew={isNew}
            onSeen={dismissNew}
            onChanged={loadAll}
            onStoreAdded={loadAll}
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
          onBuyAgain={handleAddToList}
        />
      )}

      {view === 'catalog' && (
        <CatalogView
          items={items}
          categories={categories}
          itemStores={itemStores}
          brands={brands}
          photos={photos}
          stores={stores}
          entries={entries}
          onAddToList={handleAddToList}
          onChanged={loadAll}
          onStoreAdded={loadAll}
        />
      )}

      <BottomNav
        view={view}
        onChange={changeView}
        neededCount={entries.filter((e) => e.status === 'needed').length}
      />

      {storeManagerOpen && (
        <StoreManager
          stores={stores}
          itemStores={itemStores}
          onChanged={loadAll}
          onDeleted={handleStoreDeleted}
          onClose={() => setStoreManagerOpen(false)}
        />
      )}

      <UndoToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
