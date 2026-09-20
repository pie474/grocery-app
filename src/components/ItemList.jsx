import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ItemDetail from './ItemDetail'

export default function ItemList({ entries, items, itemStores, brands, activeStoreId }) {
  const [expandedId, setExpandedId] = useState(null)

  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))

  const visibleEntries = entries.filter((entry) => {
    if (entry.status === 'got') return false
    if (activeStoreId === null) return true
    return itemStores.some(
      (link) => link.item_id === entry.item_id && link.store_id === activeStoreId,
    )
  })

  const grouped = visibleEntries.reduce((acc, entry) => {
    const category = itemsById[entry.item_id]?.category || 'uncategorized'
    acc[category] = acc[category] || []
    acc[category].push(entry)
    return acc
  }, {})

  async function markGot(entryId) {
    await supabase.from('list_entries').update({ status: 'got' }).eq('id', entryId)
  }

  if (!visibleEntries.length) {
    return <p className="empty-state">Nothing needed here right now.</p>
  }

  return (
    <div className="item-list">
      {Object.entries(grouped).map(([category, categoryEntries]) => (
        <div key={category} className="category-group">
          <h3>{category}</h3>
          {categoryEntries.map((entry) => {
            const item = itemsById[entry.item_id]
            const itemBrands = brands.filter((b) => b.item_id === entry.item_id)
            const isExpanded = expandedId === entry.id

            return (
              <div key={entry.id} className="list-row">
                <div className="list-row-main">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => markGot(entry.id)}
                  />
                  <button
                    className="item-name"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {item?.name}
                  </button>
                  {entry.quantity && <span className="quantity">{entry.quantity}</span>}
                </div>
                {isExpanded && item && (
                  <ItemDetail item={item} brands={itemBrands} />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
