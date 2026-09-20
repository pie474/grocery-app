import { formatRelativeTime } from '../utils/time'

export default function BoughtView({ entries, items, members = [], onMoveBack, onDeleteForever }) {
  const itemsById = Object.fromEntries(items.map((i) => [i.id, i]))
  const membersById = Object.fromEntries(members.map((m) => [m.id, m]))

  const bought = entries
    .filter((e) => e.status === 'got')
    .sort((a, b) => new Date(b.bought_at || b.created_at) - new Date(a.bought_at || a.created_at))

  if (!bought.length) {
    return <p className="empty-state">Nothing bought yet.</p>
  }

  return (
    <div className="bought-view">
      {bought.map((entry) => {
        const item = itemsById[entry.item_id]
        const addedByName = membersById[entry.added_by]?.name

        return (
          <div key={entry.id} className="bought-row">
            <div className="bought-row-main">
              <span className="item-name">{item?.name}</span>
              {entry.quantity && <span className="quantity">{entry.quantity}</span>}
            </div>
            <div className="list-row-meta">
              {entry.note && <span className="entry-note">{entry.note}</span>}
              {addedByName && <span className="entry-added-by">added by {addedByName}</span>}
              <span className="entry-bought-at">
                bought {formatRelativeTime(entry.bought_at || entry.created_at)}
              </span>
            </div>
            <div className="bought-row-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onMoveBack(entry)}
              >
                Move back to list
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeleteForever(entry)}
              >
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
