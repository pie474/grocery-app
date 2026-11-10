import { formatRelativeTime } from '../utils/time'

// What the household knows about an item, as labelled facts: brand (with
// its photo), how to pick a good one, and when it was last bought. Shows
// nothing when there's nothing to say.
export default function ItemDetail({ item, brands }) {
  const preferred = brands.find((b) => b.is_preferred) || brands[0]
  const otherBrands = brands.filter((b) => b !== preferred)
  if (!preferred && !item.selection_criteria && !item.last_bought_at) return null

  return (
    <div className="item-facts">
      {preferred?.image_url && (
        <img className="item-facts-photo" src={preferred.image_url} alt={preferred.brand_name} />
      )}
      <dl>
        {preferred && (
          <div>
            <dt>{otherBrands.length ? 'Preferred brand' : 'Brand'}</dt>
            <dd>
              <span className="item-facts-brand">{preferred.brand_name}</span>
              {otherBrands.length > 0 && (
                <span className="item-facts-also">
                  Also: {otherBrands.map((b) => b.brand_name).join(', ')}
                </span>
              )}
            </dd>
          </div>
        )}
        {item.selection_criteria && (
          <div>
            <dt>How to pick</dt>
            <dd>{item.selection_criteria}</dd>
          </div>
        )}
        {item.last_bought_at && (
          <div>
            <dt>Last bought</dt>
            <dd>{formatRelativeTime(item.last_bought_at)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
