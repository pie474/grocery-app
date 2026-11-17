import { formatRelativeTime } from '../utils/time'
import PhotoThumb from './PhotoThumb'

// What the household knows about an item, as labelled facts: its own
// photo, brand (with its photo), how to pick a good one, where it's sold, and when it was
// last bought. Shows nothing when there's nothing to say.
//
// stores: the stores that sell it. activeStoreId: the store the list is
// filtered to, if any; that one goes without saying, so only the others
// are listed ("Also at").
export default function ItemDetail({ item, brands, stores = [], activeStoreId = null }) {
  const preferred = brands.find((b) => b.is_preferred) || brands[0]
  const otherBrands = brands.filter((b) => b !== preferred)
  const filtered = stores.some((s) => s.id === activeStoreId)
  const storeNames = stores
    .filter((s) => s.id !== activeStoreId)
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b))
  const hasPhoto = !!(item.image_url || preferred?.image_url)
  if (
    !hasPhoto &&
    !preferred &&
    !item.selection_criteria &&
    !item.last_bought_at &&
    !stores.length
  ) {
    return null
  }

  return (
    <div className="item-facts">
      {hasPhoto && (
        // the item's own photo first, then the brand's packaging
        <div className="item-facts-photos">
          {item.image_url && (
            <PhotoThumb
              className="item-facts-photo"
              src={item.image_url}
              alt={item.name}
              caption={item.name}
            />
          )}
          {preferred?.image_url && (
            <PhotoThumb
              className="item-facts-photo"
              src={preferred.image_url}
              alt={preferred.brand_name}
              caption={preferred.brand_name}
            />
          )}
        </div>
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
        {stores.length > 0 && (
          <div>
            <dt>{filtered ? 'Also at' : 'Available at'}</dt>
            <dd>{storeNames.length ? storeNames.join(', ') : 'Nowhere else'}</dd>
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
