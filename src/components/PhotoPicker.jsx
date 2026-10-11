import { useRef, useState } from 'react'
import { uploadPhoto } from '../utils/photos'

// Take or choose a photo (phones offer both for accept="image/*"), upload
// it, and hand the public URL to onChange. onChange('') means removed.
export default function PhotoPicker({
  imageUrl,
  onChange,
  onBusyChange,
  addLabel = 'Add photo',
  removable = false,
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function setBusy(busy) {
    setUploading(busy)
    onBusyChange?.(busy)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      await onChange(await uploadPhoto(file))
    } catch (err) {
      console.error(err)
      setError("Couldn't upload that photo. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="photo-picker">
      {imageUrl && <img className="photo-thumb" src={imageUrl} alt="" />}
      <button
        type="button"
        className="secondary-button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : imageUrl ? 'Change photo' : addLabel}
      </button>
      {removable && imageUrl && !uploading && (
        <button type="button" className="icon-button" onClick={() => onChange('')}>
          Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Photo file"
        onChange={handleFile}
      />
      {error && <p className="field-hint photo-error">{error}</p>}
    </div>
  )
}
