// What to look for when buying an item: the preferred brand's photo (tap
// to enlarge), its name, other acceptable brands, and picking tips. With
// none of those yet, an invitation to add them instead.
export default function ItemDetail({ item, brands, onPhotoClick, onAddDetails }) {
  const preferred = brands.find((b) => b.is_preferred) || brands[0]
  const others = brands.filter((b) => b !== preferred)

  if (!preferred && !item.selection_criteria) {
    return (
      <button type="button" className="item-detail-empty" onClick={onAddDetails}>
        Add a photo, brand or picking tips
      </button>
    )
  }

  return (
    <div className="item-detail">
      {preferred?.image_url && (
        <button
          type="button"
          className="item-photo"
          aria-label={`Enlarge photo of ${preferred.brand_name}`}
          onClick={() => onPhotoClick({ src: preferred.image_url, alt: preferred.brand_name })}
        >
          <img src={preferred.image_url} alt="" />
        </button>
      )}
      <div className="item-detail-text">
        {preferred && <p className="brand-name">{preferred.brand_name}</p>}
        {others.length > 0 && (
          <p className="other-brands">Also fine: {others.map((b) => b.brand_name).join(', ')}</p>
        )}
        {item.selection_criteria && (
          <p className="selection-criteria">
            <strong>How to pick:</strong> {item.selection_criteria}
          </p>
        )}
      </div>
    </div>
  )
}
