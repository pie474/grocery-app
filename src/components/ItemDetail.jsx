import { supabase } from '../supabaseClient'
import { formatRelativeTime } from '../utils/time'
import PhotoPicker from './PhotoPicker'

export default function ItemDetail({ item, brands, onChanged }) {
  const preferred = brands.find((b) => b.is_preferred) || brands[0]

  // The photo lives on the preferred brand; items with no brand yet get one
  // named after the item so the photo has somewhere to go.
  async function savePhoto(url) {
    const { error } = preferred
      ? await supabase.from('item_brands').update({ image_url: url }).eq('id', preferred.id)
      : await supabase.from('item_brands').insert({
          item_id: item.id,
          brand_name: item.name,
          image_url: url,
          is_preferred: true,
        })
    if (error) throw error
    await onChanged?.()
  }

  return (
    <div className="item-detail">
      {preferred?.image_url && (
        <img
          className="brand-image"
          src={preferred.image_url}
          alt={preferred.brand_name}
        />
      )}
      <PhotoPicker
        imageUrl={null}
        onChange={savePhoto}
        addLabel={preferred?.image_url ? 'Change photo' : 'Add photo'}
      />
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
