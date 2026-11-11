import { useEffect, useRef, useState } from 'react'

// A small photo that opens full size when tapped, so a brand's packaging
// can actually be read in the shop. `className` styles the thumbnail.
export default function PhotoThumb({ src, alt = '', caption, className }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="photo-thumb-button"
        aria-label={caption ? `Enlarge photo of ${caption}` : 'Enlarge photo'}
        onClick={() => setOpen(true)}
      >
        <img className={className} src={src} alt={alt} />
      </button>
      {open && <Lightbox src={src} caption={caption} onClose={() => setOpen(false)} />}
    </>
  )
}

function Lightbox({ src, caption, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="photo-lightbox"
      aria-label={caption ? `Photo of ${caption}` : 'Photo'}
      onCancel={(e) => {
        e.preventDefault()
        // this may sit on top of another dialog; don't let Escape reach it
        e.stopPropagation()
        onClose()
      }}
      // a tap anywhere, photo included, closes it
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <img src={src} alt={caption || ''} />
      {caption && <p className="photo-lightbox-caption">{caption}</p>}
      <button type="button" className="photo-lightbox-close" aria-label="Close photo" autoFocus>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </dialog>
  )
}
