import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import AddStoreInline from './AddStoreInline'

export default function StoreFilter({
  stores,
  entries = [],
  itemStores = [],
  activeStoreId,
  onChange,
  onStoreAdded,
}) {
  const scrollerRef = useRef(null)
  const pillRefs = useRef({})
  // which edges have more pills hidden past them, for the fade
  const [edges, setEdges] = useState({ start: false, end: false })
  const edgesRef = useRef(edges)

  // How many things on the list each store has, so people can see at a
  // glance which shop is worth the trip.
  const counts = useMemo(() => {
    const neededItemIds = entries.filter((e) => e.status !== 'got').map((e) => e.item_id)
    const byStore = {}
    for (const store of stores) {
      const itemIds = new Set(
        itemStores.filter((l) => l.store_id === store.id).map((l) => l.item_id),
      )
      byStore[store.id] = neededItemIds.filter((id) => itemIds.has(id)).length
    }
    return { all: neededItemIds.length, byStore }
  }, [stores, entries, itemStores])

  function updateEdges() {
    const el = scrollerRef.current
    if (!el) return
    const start = el.scrollLeft > 1
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    // Only set state on a real change. This runs after every render, and
    // a setState there that React can't skip up front re-renders, runs
    // this again, and loops.
    if (edgesRef.current.start === start && edgesRef.current.end === end) return
    edgesRef.current = { start, end }
    setEdges(edgesRef.current)
  }

  useLayoutEffect(updateEdges)

  useEffect(() => {
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [])

  // Bring the selected pill fully into view, e.g. after picking one that
  // was half hidden under the fade. Scrolls only the pill row, never the page.
  useEffect(() => {
    const scroller = scrollerRef.current
    const pill = pillRefs.current[activeStoreId ?? 'all']
    if (!scroller || !pill) return
    const margin = 32 // clear of the fade
    const left = pill.offsetLeft // the scroller is the offsetParent
    const right = left + pill.offsetWidth
    let target = null
    if (left - margin < scroller.scrollLeft) target = left - margin
    else if (right + margin > scroller.scrollLeft + scroller.clientWidth)
      target = right + margin - scroller.clientWidth
    if (target === null) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ left: Math.max(0, target), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [activeStoreId])

  function pill(key, label, count, storeId) {
    const active = activeStoreId === storeId
    return (
      <button
        key={key}
        ref={(el) => (pillRefs.current[key] = el)}
        type="button"
        className={active ? 'store-pill active' : 'store-pill'}
        aria-pressed={active}
        aria-label={`${label}, ${count} needed`}
        onClick={() => onChange(storeId)}
      >
        <span className="store-pill-label">
          {label}
          <span className={count ? 'store-pill-count' : 'store-pill-count zero'}>{count}</span>
        </span>
      </button>
    )
  }

  return (
    <div className="store-filter">
      <div
        ref={scrollerRef}
        className="store-filter-scroller"
        data-fade-start={edges.start || undefined}
        data-fade-end={edges.end || undefined}
        onScroll={updateEdges}
      >
        {pill('all', 'All items', counts.all, null)}
        {stores.map((store) => pill(store.id, store.name, counts.byStore[store.id] || 0, store.id))}
      </div>
      {/* outside the scrolling row: the button is always in reach, and
          its form drops onto a full-width line of its own */}
      <AddStoreInline stores={stores} onAdded={() => onStoreAdded?.()} />
    </div>
  )
}
