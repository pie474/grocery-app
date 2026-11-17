import PhotoPicker from './PhotoPicker'
import PhotoThumb from './PhotoThumb'

// An item's own photos (as opposed to a brand's): the ones added so far,
// each with a remove button, then a button to add another. `photos` is an
// array of image URLs in display order; onChange gets the new array.
export default function PhotosField({ photos, onChange, onBusyChange, itemName }) {
  return (
    <div className="photos-field">
      {photos.length > 0 && (
        <ul className="photos-field-list">
          {photos.map((url, index) => (
            <li key={url}>
              <PhotoThumb className="photo-thumb" src={url} caption={itemName} />
              <button
                type="button"
                className="photos-field-remove"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => onChange(photos.filter((u) => u !== url))}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* always empty, so it stays an "add" button; each upload is appended */}
      <PhotoPicker
        imageUrl=""
        onChange={(url) => url && onChange([...photos, url])}
        onBusyChange={onBusyChange}
        addLabel={photos.length ? 'Add another photo' : 'Add a photo'}
      />
    </div>
  )
}
