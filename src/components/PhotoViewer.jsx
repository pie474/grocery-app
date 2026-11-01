import { useEffect, useRef } from 'react'

// Full-screen view of an item photo, for checking the package in the
// store. A tap anywhere, the close button or Escape dismisses it.
export default function PhotoViewer({ src, alt, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label={alt}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={onClose}
    >
      <img src={src} alt={alt} />
      <button type="button" className="photo-viewer-close" aria-label="Close photo">
        ✕
      </button>
    </dialog>
  )
}
