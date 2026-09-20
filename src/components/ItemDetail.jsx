import { formatRelativeTime } from '../utils/time'

export default function ItemDetail({ item, brands }) {
  const preferred = brands.find((b) => b.is_preferred) || brands[0]

  return (
    <div className="item-detail">
      {preferred?.image_url && (
        <img
          className="brand-image"
          src={preferred.image_url}
          alt={preferred.brand_name}
        />
      )}
      {preferred && (
        <p className="brand-name">Preferred: {preferred.brand_name}</p>
      )}
      {item.selection_criteria && (
        <p className="selection-criteria">
          <strong>How to pick:</strong> {item.selection_criteria}
        </p>
      )}
      {item.last_bought_at && (
        <p className="last-bought">
          Last bought {formatRelativeTime(item.last_bought_at)}
        </p>
      )}
      {brands.length > 1 && (
        <div className="other-brands">
          {brands
            .filter((b) => b !== preferred)
            .map((b) => (
              <span key={b.id} className="brand-chip">
                {b.brand_name}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
